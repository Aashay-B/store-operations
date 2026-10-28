# Cioffi's Store Operations

Standalone Next.js app for the store's Order Request and Inventory Cycle workflows. It intentionally lives at **`/store-ops`**; the deployment root returns 404 so it remains free for future products.

## Set up a separate Supabase project

1. Create a new Supabase project—do not reuse CLM's.
2. Run the files in `supabase/migrations/` in its SQL editor, in filename order. Optionally run `supabase/seed_products.sql` afterwards to load the sample product list.
3. Copy `.env.example` to `.env.local` and add that project’s URL and anonymous key.
4. Create a separate Vercel project with `store-operations` as its Root Directory and add the same two environment variables.

Until then, the UI runs in clearly-marked browser demo mode so the dashboard and visual data flow can be reviewed.
