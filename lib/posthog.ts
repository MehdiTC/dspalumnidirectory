import posthog from 'posthog-js'

if (typeof window !== 'undefined' && !posthog.__loaded) {
  posthog.init('phc_qzpJn9wai6l4DhqVht2f6EPN6QfbEvqPy0hOnirPNUZ', {
    api_host: 'https://app.posthog.com', // or your self-hosted URL
  })
}

export default posthog
