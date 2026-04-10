import { createClient } from './supabase/server';
import { cookies } from 'next/headers';

const LIMIT_ANONYMOUS = 10;
const LIMIT_AUTHENTICATED = 20;

export async function checkRateLimit() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  let deviceId = cookieStore.get('device_id')?.value;
  
  // If no device_id and not logged in, create one
  if (!deviceId && !user) {
    deviceId = crypto.randomUUID();
    // We set it later in the response if needed, but for now we just use the generated one
  }

  if (user) {
    // Check authenticated limit
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('usage_count')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return { allowed: true, currentCount: 0, limit: LIMIT_AUTHENTICATED, type: 'auth' };
    }

    return {
      allowed: profile.usage_count < LIMIT_AUTHENTICATED,
      currentCount: profile.usage_count,
      limit: LIMIT_AUTHENTICATED,
      type: 'auth',
      userId: user.id
    };
  } else {
    // Check anonymous limit
    if (!deviceId) return { allowed: true, currentCount: 0, limit: LIMIT_ANONYMOUS, type: 'anon' };

    const { data: usage, error } = await supabase
      .from('anonymous_usage')
      .select('usage_count')
      .eq('device_id', deviceId)
      .single();

    if (error || !usage) {
      return { allowed: true, currentCount: 0, limit: LIMIT_ANONYMOUS, type: 'anon', deviceId };
    }

    return {
      allowed: usage.usage_count < LIMIT_ANONYMOUS,
      currentCount: usage.usage_count,
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
