import { notFound } from 'next/navigation'
import MvpPreviewClient from './MvpPreviewClient'

// Vista previa SOLO en desarrollo (`npm run dev`): votación y revelación del MVP con
// datos inventados, sin tocar la base de datos. En producción devuelve 404.
export default function MvpPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <MvpPreviewClient />
}
