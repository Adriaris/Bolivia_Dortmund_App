import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { PlayerProfileProvider } from '@/components/players/PlayerProfileProvider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import SplashScreen from '@/components/SplashScreen'
import BottomNav from '@/components/BottomNav'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Bolivia Dortmund',
  description: 'Registro de partidos y estadísticas del Bolivia Dortmund (BVD 04)',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bolivia Dortmund',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: extensiones (ColorZilla, etc.) añaden atributos al body antes de hidratar */}
      <body className="min-h-full bg-black font-sans" suppressHydrationWarning>
        {/* Cubre el notch/Dynamic Island con fondo negro en todas las páginas.
            Elemento DOM real para mantener estable la safe-area en PWA */}
        <div className="notch-cover" />
        <SplashScreen />
        <AuthProvider>
          <PlayerProfileProvider>
            <div className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
            <BottomNav />
          </PlayerProfileProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
