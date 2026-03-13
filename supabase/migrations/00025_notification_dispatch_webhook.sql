-- Enable pg_net extension for HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function that dispatches notifications via HTTP to the app server.
-- Sends both email and push notifications through a single endpoint.
CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS TRIGGER AS $$
DECLARE
  app_url TEXT;
  webhook_secret TEXT;
BEGIN
  -- Read app URL from Supabase vault or fall back to app_settings
  -- These are set via: SELECT set_config('app.settings.app_url', 'https://your-app.vercel.app', false);
  -- Or via Supabase dashboard > Database > Extensions > Configuration
  app_url := current_setting('app.settings.app_url', true);
  webhook_secret := current_setting('app.settings.webhook_secret', true);

  -- Skip if app_url is not configured
  IF app_url IS NULL OR app_url = '' THEN
    RAISE LOG 'dispatch_notification: app_url not configured, skipping';
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST to the dispatch endpoint
  PERFORM net.http_post(
    url := app_url || '/api/notifications/dispatch',
    body := jsonb_build_object('notification_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', COALESCE(webhook_secret, '')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire dispatch on every new notification
CREATE TRIGGER on_notification_dispatch
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_notification();
