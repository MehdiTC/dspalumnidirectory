import posthog from 'posthog-js'

if (typeof window !== 'undefined' && !posthog.__loaded) {
  posthog.init(
    process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // We'll capture manually
    }
  )
}

export default posthog
