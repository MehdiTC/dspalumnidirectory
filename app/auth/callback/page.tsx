'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Callback() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          console.error('Auth callback error:', error, errorDescription)
          setError(errorDescription || 'Authentication failed')
          return
        }

        // Let Supabase handle the code exchange automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          return
        }

      if (session) {
        router.replace('/')
      } else {
          setError('No session found. Please try logging in again.')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    }
    check()
  }, [router, supabase, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-[#012169] text-white rounded-md hover:bg-[#001a4d] transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#012169] mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
} 