import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client or handle it to prevent build crash
    // Best is to just let it return the client with placeholders if it's build time
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}
