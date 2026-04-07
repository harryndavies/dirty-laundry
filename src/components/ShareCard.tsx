import { useRef, useCallback } from 'react'
import { toast } from '@/components/ui/Toast'

interface ShareCardProps {
  groupName: string
  period: string
  totalChores: number
  totalPoints: number
  members: { name: string; color: string; points: number; pct: number }[]
  topChore: string | null
}

export function ShareCard({ groupName, period, totalChores, totalPoints, members, topChore }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generate = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = 640
    const h = 480
    canvas.width = w
    canvas.height = h

    // Background
    ctx.fillStyle = '#FFE500'
    ctx.fillRect(0, 0, w, h)

    // Border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, w - 6, h - 6)

    // Header bar
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, 56)
    ctx.font = 'bold 14px "IBM Plex Mono", monospace'
    ctx.fillStyle = '#FFE500'
    ctx.textAlign = 'center'
    ctx.fillText(`${groupName.toUpperCase()} — ${period.toUpperCase()}`, w / 2, 36)

    // Stats row
    const statsY = 80
    ctx.font = 'bold 32px "IBM Plex Mono", monospace'
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.fillText(`${totalChores}`, w / 4, statsY + 10)
    ctx.fillText(`${totalPoints}`, (w / 4) * 3, statsY + 10)
    ctx.font = 'bold 10px "IBM Plex Mono", monospace'
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillText('CHORES DONE', w / 4, statsY + 28)
    ctx.fillText('POINTS EARNED', (w / 4) * 3, statsY + 28)

    // Divider
    ctx.fillStyle = '#000'
    ctx.fillRect(20, statsY + 45, w - 40, 3)

    // Member bars
    const barStartY = statsY + 65
    const barHeight = 28
    const barGap = 8
    const barMaxWidth = w - 160
    const maxPts = Math.max(...members.map(m => m.points), 1)

    members.slice(0, 5).forEach((m, i) => {
      const y = barStartY + i * (barHeight + barGap)

      // Name
      ctx.font = 'bold 12px "IBM Plex Mono", monospace'
      ctx.fillStyle = '#000'
      ctx.textAlign = 'left'
      ctx.fillText(m.name.length > 10 ? m.name.slice(0, 9) + '…' : m.name, 24, y + 18)

      // Bar background
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(120, y, barMaxWidth, barHeight)

      // Bar fill
      ctx.fillStyle = m.color
      ctx.fillRect(120, y, barMaxWidth * (m.points / maxPts), barHeight)

      // Bar border
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.strokeRect(120, y, barMaxWidth, barHeight)

      // Points + percentage
      ctx.font = 'bold 11px "IBM Plex Mono", monospace'
      ctx.fillStyle = '#000'
      ctx.textAlign = 'right'
      ctx.fillText(`${m.points} pts (${m.pct}%)`, w - 24, y + 18)
    })

    // Top chore
    if (topChore) {
      const choreY = barStartY + Math.min(members.length, 5) * (barHeight + barGap) + 10
      ctx.font = 'bold 10px "IBM Plex Mono", monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.textAlign = 'center'
      ctx.fillText(`MOST DONE: ${topChore.toUpperCase()}`, w / 2, choreY + 10)
    }

    // Footer
    ctx.fillStyle = '#000'
    ctx.fillRect(0, h - 36, w, 36)
    ctx.font = 'bold 11px "IBM Plex Mono", monospace'
    ctx.fillStyle = '#FFE500'
    ctx.textAlign = 'center'
    ctx.fillText('DIRTY LAUNDRY — dirtylaundry.club', w / 2, h - 14)

    // Share or download
    canvas.toBlob(async (blob) => {
      if (!blob) return

      const file = new File([blob], 'dirty-laundry-report.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${groupName} — ${period}`,
          })
        } catch {
          // User cancelled
        }
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dirty-laundry-report.png'
        a.click()
        URL.revokeObjectURL(url)
        toast('Card downloaded!', 'bg-brutal-lime')
      }
    }, 'image/png')
  }, [groupName, period, totalChores, totalPoints, members, topChore])

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={generate}
        className="w-full h-12 bg-brutal-blue text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
      >
        📸 SHARE REPORT
      </button>
    </>
  )
}
