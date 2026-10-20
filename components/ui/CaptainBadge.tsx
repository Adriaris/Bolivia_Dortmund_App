interface CaptainBadgeProps {
  inverted?: boolean
}

export default function CaptainBadge({ inverted = false }: CaptainBadgeProps) {
  return (
    <span className={`text-[10px] font-bold tracking-wide ml-1.5 ${inverted ? 'text-black/50' : 'text-amber-500'}`}>
      CAP
    </span>
  )
}
