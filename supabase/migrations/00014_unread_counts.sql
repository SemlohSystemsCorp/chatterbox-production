-- Returns unread message counts for a given user, per channel and per conversation.
-- Called from layout.tsx server component to seed initial unread badges.
CREATE OR REPLACE FUNCTION get_unread_counts(
  p_user_id        uuid,
  p_channel_ids    uuid[],
  p_conversation_ids uuid[]
)
RETURNS TABLE(item_id uuid, item_type text, unread_count bigint)
LANGUAGE sql
SECURITY DEFINER AS $$
  SELECT
    cm.channel_id       AS item_id,
    'channel'::text     AS item_type,
    COUNT(m.id)::bigint AS unread_count
  FROM channel_members cm
  JOIN messages m ON m.channel_id = cm.channel_id
  WHERE cm.user_id          = p_user_id
    AND cm.channel_id       = ANY(p_channel_ids)
    AND m.created_at        > cm.last_read_at
    AND m.is_deleted        = false
    AND m.user_id          <> p_user_id
    AND m.thread_id         IS NULL
  GROUP BY cm.channel_id

  UNION ALL

  SELECT
    conv_m.conversation_id AS item_id,
    'dm'::text             AS item_type,
    COUNT(m.id)::bigint    AS unread_count
  FROM conversation_members conv_m
  JOIN messages m ON m.conversation_id = conv_m.conversation_id
  WHERE conv_m.user_id          = p_user_id
    AND conv_m.conversation_id  = ANY(p_conversation_ids)
    AND m.created_at            > conv_m.last_read_at
    AND m.is_deleted            = false
    AND m.user_id              <> p_user_id
    AND m.thread_id             IS NULL
  GROUP BY conv_m.conversation_id
$$;
