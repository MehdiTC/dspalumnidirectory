'use client'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

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
        const { event, session } = JSON.parse(e.newValue || '{}')
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Refresh the page to ensure all components have the latest session
          window.location.reload()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [supabaseClient])

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
} 