'use client'
import { useEffect } from 'react'
import posthog from '../lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Manually capture pageviews on route change
    const handle = () => posthog.capture('$pageview')
    window.addEventListener('popstate', handle)
    window.addEventListener('pushState', handle)
    window.addEventListener('replaceState', handle)
    // Initial pageview
    posthog.capture('$pageview')
    return () => {
      window.removeEventListener('popstate', handle)
      window.removeEventListener('pushState', handle)
      window.removeEventListener('replaceState', handle)
    }
  }, [])

  return <>{children}</>
}