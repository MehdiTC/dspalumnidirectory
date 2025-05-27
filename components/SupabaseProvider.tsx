'use client'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Handle auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Broadcast the auth state change to other tabs
        window.localStorage.setItem('supabase.auth.change', JSON.stringify({ event, session }))
      }
    })

    // Listen for auth state changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supabase.auth.change') {
        try {
          const { event, session } = JSON.parse(e.newValue || '{}')
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            // Refresh the page to ensure all components have the latest session
            window.location.reload()
          }
        } catch (err) {
          console.error('Error parsing auth state change:', err)
          setError('Failed to sync authentication state')
        }
      }
    }

    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        if (error) throw error
        setIsLoading(false)
      } catch (err) {
        console.error('Error checking session:', err)
        setError('Failed to initialize authentication')
        setIsLoading(false)
      }
    }

    checkSession()
    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [supabaseClient])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#012169] rounded-md hover:bg-[#001a4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#012169]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#012169] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
} 