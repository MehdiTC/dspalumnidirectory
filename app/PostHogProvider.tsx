'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import posthog from '../lib/posthog'
import { useUser } from '@supabase/auth-helpers-react'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useUser()

  // Skip analytics on 404 pages
  const is404 = pathname === '/404' || pathname === '/_not-found'

  // 1. Track pageviews on route change
  useEffect(() => {
    if (!is404) {
      posthog.capture('$pageview')
    }
  }, [pathname, searchParams, is404])

  // 2. Track page leaves
  useEffect(() => {
    const handleLeave = () => posthog.capture('$pageleave')
    window.addEventListener('beforeunload', handleLeave)
    return () => window.removeEventListener('beforeunload', handleLeave)
  }, [])

  // 3. Identify user when logged in
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
      })
    }
  }, [user])

  return <>{children}</>
}