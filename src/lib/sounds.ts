// Older Safari only has the prefixed constructor.
const AudioContextClass =
  window.AudioContext ??
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
const audioCtx = () => new AudioContextClass()

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
) {
  try {
    const ctx = audioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Sound is a nice-to-have; ignore devices that block audio.
  }
}

export function playComplete() {
  // Two-tone rising ding
  playTone(523, 0.15, 'sine', 0.25) // C5
  setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 100) // G5
  vibrate(15)
}

export function playBoost() {
  // Rising whoosh
  playTone(330, 0.1, 'square', 0.15)
  setTimeout(() => playTone(440, 0.1, 'square', 0.15), 80)
  setTimeout(() => playTone(660, 0.2, 'square', 0.2), 160)
  vibrate(10)
}

export function playNudge() {
  // Two quick taps
  playTone(880, 0.08, 'sine', 0.2)
  setTimeout(() => playTone(880, 0.08, 'sine', 0.2), 120)
  vibrate([10, 50, 10])
}

export function playDelete() {
  // Descending tone
  playTone(440, 0.15, 'sawtooth', 0.1)
  setTimeout(() => playTone(220, 0.2, 'sawtooth', 0.1), 100)
  vibrate(20)
}

export function playSpin() {
  // Quick click
  playTone(1200, 0.03, 'square', 0.1)
  vibrate(5)
}

export function playResult() {
  // Fanfare
  playTone(523, 0.15, 'sine', 0.2)
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 120)
  setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 240)
  vibrate([10, 30, 10, 30, 20])
}

function vibrate(pattern: number | number[]) {
  try {
    navigator?.vibrate?.(pattern)
  } catch {
    // Not every device can vibrate.
  }
}
