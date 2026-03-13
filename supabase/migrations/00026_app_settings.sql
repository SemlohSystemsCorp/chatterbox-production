-- Configure app settings for notification dispatch.
-- Update this URL when deploying to production.
ALTER DATABASE postgres SET app.settings.app_url = 'http://localhost:3000';

-- Set webhook secret to match WEBHOOK_SECRET env var (if used).
-- ALTER DATABASE postgres SET app.settings.webhook_secret = 'your-webhook-secret';
