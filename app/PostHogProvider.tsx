'use client'
import { useEffect } from 'react'
import posthog from '../lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // PostHog is already initialized in lib/posthog.ts
  }, [])

  return <>{children}</>
}
