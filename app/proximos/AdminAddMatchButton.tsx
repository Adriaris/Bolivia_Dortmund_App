'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

export default function AdminAddMatchButton() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null

  return (
    <Link
      href="/matches/new"
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
    >
      <Plus size={15} />
      Añadir
    </Link>
  )
}
