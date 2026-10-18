interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  imageUrl?: string | null
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
}

export function Avatar({ name, color, size = 'md', imageUrl }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizes[size]} border-2 border-brutal-black object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center border-2 border-brutal-black font-mono font-bold text-brutal-black`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}
