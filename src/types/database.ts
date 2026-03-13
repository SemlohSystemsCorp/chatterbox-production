export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          username: string | null;
          status: string;
          status_message: string | null;
          status_emoji: string | null;
          notify_email_mentions: boolean;
          notify_email_dms: boolean;
          notify_email_digest: boolean;
          notify_push_dms: boolean;
          notify_push_mentions: boolean;
          notify_push_threads: boolean;
          appearance_density: string;
          appearance_font_size: string;
          appearance_theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          status?: string;
          status_message?: string | null;
          status_emoji?: string | null;
          notify_email_mentions?: boolean;
          notify_email_dms?: boolean;
          notify_email_digest?: boolean;
          notify_push_dms?: boolean;
          notify_push_mentions?: boolean;
          notify_push_threads?: boolean;
          appearance_density?: string;
          appearance_font_size?: string;
          appearance_theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          username?: string | null;
          status?: string;
          status_message?: string | null;
          status_emoji?: string | null;
          notify_email_mentions?: boolean;
          notify_email_dms?: boolean;
          notify_email_digest?: boolean;
          notify_push_dms?: boolean;
          notify_push_mentions?: boolean;
          notify_push_threads?: boolean;
          appearance_density?: string;
          appearance_font_size?: string;
          appearance_theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      boxes: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          icon_url: string | null;
          created_by: string | null;
          is_archived: boolean;
          plan: string;
          max_seats: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          entity_type: string | null;
          call_minutes_used: number;
          call_minutes_reset_at: string;
          storage_used_bytes: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          icon_url?: string | null;
          created_by?: string | null;
          is_archived?: boolean;
          plan?: string;
          max_seats?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          entity_type?: string | null;
          call_minutes_used?: number;
          call_minutes_reset_at?: string;
          storage_used_bytes?: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          icon_url?: string | null;
          is_archived?: boolean;
          plan?: string;
          max_seats?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          entity_type?: string | null;
          call_minutes_used?: number;
          call_minutes_reset_at?: string;
          storage_used_bytes?: number;
          color?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      box_members: {
        Row: {
          id: string;
          box_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          box_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "box_members_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
        ];
      };
      channels: {
        Row: {
          id: string;
          box_id: string;
          name: string;
          slug: string;
          description: string | null;
          topic: string | null;
          is_private: boolean;
          is_archived: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          box_id: string;
          name: string;
          slug: string;
          description?: string | null;
          topic?: string | null;
          is_private?: boolean;
          is_archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          topic?: string | null;
          is_private?: boolean;
          is_archived?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_members: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          last_read_at: string;
          notifications: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          last_read_at?: string;
          notifications?: string;
          joined_at?: string;
        };
        Update: {
          last_read_at?: string;
          notifications?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          channel_id: string | null;
          conversation_id: string | null;
          user_id: string | null;
          content: string;
          thread_id: string | null;
          is_edited: boolean;
          edited_at: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel_id?: string | null;
          conversation_id?: string | null;
          user_id?: string | null;
          content: string;
          thread_id?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_messages_conversation";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          id: string;
          message_id: string;
          file_name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          file_name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          box_id: string;
          slug: string;
          is_group: boolean;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          box_id: string;
          slug?: string;
          is_group?: boolean;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          last_read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "dm" | "mention" | "thread_reply";
          message_id: string | null;
          actor_id: string | null;
          channel_id: string | null;
          conversation_id: string | null;
          body: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "dm" | "mention" | "thread_reply";
          message_id?: string | null;
          actor_id?: string | null;
          channel_id?: string | null;
          conversation_id?: string | null;
          body?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      verification_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          type: string;
          used: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          code: string;
          type?: string;
          used?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          used?: boolean;
        };
        Relationships: [];
      };
      calls: {
        Row: {
          id: string;
          channel_id: string;
          daily_room_name: string;
          daily_room_url: string;
          started_by: string | null;
          started_at: string;
          ended_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          channel_id: string;
          daily_room_name: string;
          daily_room_url: string;
          started_by?: string | null;
          started_at?: string;
          ended_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          ended_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "calls_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
        ];
      };
      call_participants: {
        Row: {
          id: string;
          call_id: string;
          user_id: string;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          call_id: string;
          user_id: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          left_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_box_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_user_conversation_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      increment_call_minutes_for_box: {
        Args: { box_id: string; minutes_to_add: number };
        Returns: void;
      };
      increment_storage_bytes_for_box: {
        Args: { box_id: string; bytes_to_add: number };
        Returns: void;
      };
      decrement_storage_bytes_for_box: {
        Args: { box_id: string; bytes_to_remove: number };
        Returns: void;
      };
      reset_call_minutes_for_box_customer: {
        Args: { customer_id: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
