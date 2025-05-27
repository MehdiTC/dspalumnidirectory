'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import posthog from '../lib/posthog'
import { useUser } from '@supabase/auth-helpers-react'

function PostHogAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useUser()

  // 1. Track pageviews on route change
  useEffect(() => {
    posthog.capture('$pageview')
  }, [pathname, searchParams])

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

  return null
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <PostHogAnalytics />
      </Suspense>
      {children}
    </>
  )
}