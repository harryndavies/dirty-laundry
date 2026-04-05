export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-6 h-6 border-[3px]',
    md: 'w-10 h-10 border-4',
    lg: 'w-14 h-14 border-[5px]',
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-brutal-black border-t-brutal-lime animate-spin`}
      />
    </div>
  )
}
