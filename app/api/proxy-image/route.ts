import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = 'virtual.fundaciovalldor7.com'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  try {
    const parsed = new URL(url)
    if (parsed.hostname !== ALLOWED_HOST) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const res = await fetch(url, {
      headers: {
        Referer: `https://${ALLOWED_HOST}/`,
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!res.ok) return new NextResponse('Not found', { status: 404 })

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/png'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Error', { status: 500 })
  }
}
