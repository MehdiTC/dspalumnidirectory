import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const error_description = requestUrl.searchParams.get('error_description');

    if (error) {
      console.error('Auth error:', error, error_description);
      return NextResponse.redirect(new URL(`/login?error=${error}`, requestUrl.origin));
    }

    if (code) {
      const supabase = createRouteHandlerClient({ cookies });
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return NextResponse.redirect(new URL(`/login?error=${sessionError.message}`, requestUrl.origin));
      }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(new URL('/login?error=An unexpected error occurred', requestUrl.origin));
  }
} 