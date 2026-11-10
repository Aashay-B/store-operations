# Cioffi's Store Operations

Standalone Next.js app for the store's Order Request and Inventory Cycle workflows. It intentionally lives at **`/store-ops`**; the deployment root returns 404 so it remains free for future products.

## Set up a separate Supabase project

1. Create a new Supabase project—do not reuse CLM's.
2. Run the files in `supabase/migrations/` in its SQL editor, in filename order. Optionally run `supabase/seed_products.sql` afterwards to load the sample product list.
3. Copy `.env.example` to `.env.local` and add that project’s URL and anonymous key.
4. Create a separate Vercel project with `store-operations` as its Root Directory and add the same two environment variables, plus `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

## Protect the login with Cloudflare Turnstile

1. In Cloudflare, open the existing **CLM Authentication** Turnstile widget and add the Store Operations production hostname to its allowed hostnames. You may reuse its site key for this app after that hostname is added.
2. In this Store Operations Supabase project's **Authentication → Attack Protection** page, enable CAPTCHA protection, select **Turnstile by Cloudflare**, paste the widget's **secret key**, and save.
3. In the Store Operations Vercel project, add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` with the widget's **site key**, then redeploy.

The site key is safe to expose in the browser. Keep the secret key only in Supabase; do not put it in Vercel or source control.

Until then, the UI runs in clearly-marked browser demo mode so the dashboard and visual data flow can be reviewed.
