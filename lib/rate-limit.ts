import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

const LIMIT_ANONYMOUS = 2;
const LIMIT_AUTHENTICATED = 4;

export async function checkRateLimit() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  let deviceId = cookieStore.get('device_id')?.value;
  
  // If no device_id and not logged in, create one
  if (!deviceId && !user) {
    deviceId = crypto.randomUUID();
  }

  // Calculate 24 hours ago
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (user) {
    // Check authenticated limit by counting real analyses
    const { count, error } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo);

    const currentCount = count || 0;

    return {
      allowed: currentCount < LIMIT_AUTHENTICATED,
      currentCount: currentCount,
      limit: LIMIT_AUTHENTICATED,
      type: 'auth',
      userId: user.id
    };
  } else {
    // Check anonymous limit
    if (!deviceId) return { allowed: true, currentCount: 0, limit: LIMIT_ANONYMOUS, type: 'anon', deviceId };

    const { count, error } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .is('user_id', null)
      .gte('created_at', twentyFourHoursAgo);

    const currentCount = count || 0;

    return {
      allowed: currentCount < LIMIT_ANONYMOUS,
      currentCount: currentCount,
      limit: LIMIT_ANONYMOUS,
      type: 'anon',
      deviceId
    };
  }
}

export async function incrementUsage(identity: { userId?: string; deviceId?: string }) {
  const supabase = await createClient();

  if (identity.userId) {
    // Increment for authenticated user
    const { data: profile } = await supabase
      .from('profiles')
      .select('usage_count')
      .eq('id', identity.userId)
      .single();
    
    await supabase
      .from('profiles')
      .update({ usage_count: (profile?.usage_count || 0) + 1 })
      .eq('id', identity.userId);
  } else if (identity.deviceId) {
    // Increment for anonymous user
    const { data: usage } = await supabase
      .from('anonymous_usage')
      .select('usage_count')
      .eq('device_id', identity.deviceId)
      .single();

    if (!usage) {
      await supabase
        .from('anonymous_usage')
        .insert({ device_id: identity.deviceId, usage_count: 1 });
    } else {
      await supabase
        .from('anonymous_usage')
        .update({ usage_count: usage.usage_count + 1, last_used: new Date().toISOString() })
        .eq('device_id', identity.deviceId);
    }
  }
}
