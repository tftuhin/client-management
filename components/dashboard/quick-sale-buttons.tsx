'use client'

import { useRouter } from 'next/navigation'

type Source = {
  value: string
  label: string
  btnBg: string
  btnText: string
  btnBorder: string
}

export function QuickSaleButtons({ sources }: { sources: Source[] }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sources.map(src => (
        <button
          key={src.value}
          onClick={() => router.push(`/invoices/new?source=${src.value}`)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${src.btnBg} ${src.btnText} ${src.btnBorder}`}
        >
          + {src.label} Sale
        </button>
      ))}
    </div>
  )
}
