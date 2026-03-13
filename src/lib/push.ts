// Edge-compatible Web Push implementation using Web Crypto API.
// Implements RFC 8291 (Web Push encryption) and RFC 8292 (VAPID).
// No Node.js dependencies — runs on Vercel Edge, Cloudflare Workers, etc.

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ─── Base64url helpers ───

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Concat helper ───

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

// ─── HKDF (extract + expand) via Web Crypto ───

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm as unknown as BufferSource,
    "HKDF",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as unknown as BufferSource,
      info: info as unknown as BufferSource,
    },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// ─── VAPID JWT signing (ES256) ───

async function createVapidJwt(
  endpoint: string,
  subject: string,
  publicKeyBase64url: string,
  privateKeyBase64url: string
): Promise<{ authorization: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      })
    )
  );

  // Import the VAPID private key as ECDSA P-256
  const rawPrivate = base64urlDecode(privateKeyBase64url);
  const rawPublic = base64urlDecode(publicKeyBase64url);

  // Build JWK for the private key
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64urlEncode(rawPublic.slice(1, 33)),
    y: base64urlEncode(rawPublic.slice(33, 65)),
    d: base64urlEncode(rawPrivate),
  };

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    sigInput
  );

  const jwt = `${header}.${payload}.${base64urlEncode(signature)}`;

  return {
    authorization: `vapid t=${jwt},k=${publicKeyBase64url}`,
  };
}

// ─── Web Push payload encryption (RFC 8291 / aes128gcm) ───

async function encryptPayload(
  subscriberPublicKeyBase64url: string,
  subscriberAuthBase64url: string,
  payloadBytes: Uint8Array
): Promise<Uint8Array> {
  const subscriberPublicKeyRaw = base64urlDecode(subscriberPublicKeyBase64url);
  const authSecret = base64urlDecode(subscriberAuthBase64url);

  // Import subscriber's public key (p256dh)
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyRaw as unknown as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  // Generate ephemeral ECDH key pair
  const localKeyPair = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  )) as CryptoKeyPair;

  // Export local public key (uncompressed point)
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate 16-byte random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = concat(infoPrefix, subscriberPublicKeyRaw, localPublicKeyRaw);
  const ikm = await hkdfDerive(authSecret, sharedSecret, keyInfo, 32);

  // Derive content encryption key and nonce
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const cek = await hkdfDerive(salt, ikm, cekInfo, 16);
  const nonce = await hkdfDerive(salt, ikm, nonceInfo, 12);

  // Pad the plaintext: payload + 0x02 (final record delimiter)
  const padded = concat(payloadBytes, new Uint8Array([2]));

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek as unknown as BufferSource,
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as unknown as BufferSource },
      aesKey,
      padded as unknown as BufferSource
    )
  );

  // Build the aes128gcm header:
  // salt (16) || rs (4, big-endian) || idlen (1) || keyid (65, local public key)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const idlen = new Uint8Array([65]);

  return concat(salt, rs, idlen, localPublicKeyRaw, encrypted);
}

// ─── Main send function ───

export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
  }
): Promise<Response> {
  const vapidSubject =
    process.env.VAPID_SUBJECT || "mailto:notifications@chatterbox.app";
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  // Encrypt the payload
  const encryptedBody = await encryptPayload(
    subscription.p256dh,
    subscription.auth,
    payloadBytes
  );

  // Create VAPID authorization
  const { authorization } = await createVapidJwt(
    subscription.endpoint,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  // Send the push message
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: encryptedBody as unknown as BodyInit,
  });

  if (!response.ok) {
    const err = new Error(
      `Push send failed: ${response.status} ${response.statusText}`
    );
    (err as any).statusCode = response.status;
    throw err;
  }

  return response;
}
