const DAILY_API_URL = "https://api.daily.co/v1";

export async function createRoom(name: string) {
  const res = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name,
      properties: {
        enable_screenshare: true,
        enable_chat: false,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
    }),
  });
  return res.json();
}

export async function createMeetingToken(roomName: string, userId: string) {
  const res = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    }),
  });
  return res.json();
}

export async function deleteRoom(name: string) {
  const res = await fetch(`${DAILY_API_URL}/rooms/${name}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
  });
  return res.ok;
}
