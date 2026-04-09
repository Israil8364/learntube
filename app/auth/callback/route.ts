import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session?.user) {
      // Transfer anonymous videos to the signed-in user
      const cookieStore = await cookies()
      const deviceId = cookieStore.get('device_id')?.value
      
      if (deviceId) {
        await supabase
          .from('analyses')
          .update({ user_id: data.session.user.id })
          .eq('device_id', deviceId)
          .is('user_id', null)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Auth callback error during session exchange:', error?.message)
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=auth-callback-failed`)
}
