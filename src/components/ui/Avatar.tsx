interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`${sizes[size]} border-2 border-brutal-black flex items-center justify-center font-mono font-bold text-brutal-black`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
