'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Callback() {
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/')
      } else {
        router.replace('/login?error=session')
      }
    }
    check()
  }, [router, supabase])

  return <p className="p-4">Logging you in...</p>
} 