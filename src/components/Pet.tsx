import type { PetMood } from '@/lib/hooks/usePetState'

interface PetProps {
  mood: PetMood
  size?: number
  bob?: boolean
}

const BODY_COLOR: Record<PetMood, string> = {
  happy: '#BFFF00',   // brutal-lime
  content: '#FFE500', // brutal-yellow
  bored: '#FFE500',
  sad: '#0066FF',     // brutal-blue
  filthy: '#7A7A4A',  // muddy
}

// A blocky brutalist pet — square body, big eyes, mouth that morphs by mood.
// Built once and rendered with conditional facial elements.
export function Pet({ mood, size = 200, bob = true }: PetProps) {
  const fill = BODY_COLOR[mood]

  return (
    <div
      className={bob ? 'pet-bob' : ''}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      <style>{`
        @keyframes pet-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pet-wiggle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes pet-droop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        .pet-bob { animation: pet-bob 2.4s ease-in-out infinite; }
        .pet-bob.happy { animation: pet-wiggle 0.6s ease-in-out infinite; }
        .pet-bob.sad, .pet-bob.filthy { animation: pet-droop 3.5s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 200 200" width={size} height={size} className={mood} style={{ animation: 'inherit' }}>
        {/* Sparkles for happy */}
        {mood === 'happy' && (
          <g stroke="#000" strokeWidth="3" fill="#FFE500">
            <polygon points="20,30 24,40 34,44 24,48 20,58 16,48 6,44 16,40" />
            <polygon points="180,40 183,48 191,51 183,54 180,62 177,54 169,51 177,48" />
            <polygon points="170,160 173,168 181,171 173,174 170,182 167,174 159,171 167,168" />
          </g>
        )}

        {/* Stink lines / flies for filthy */}
        {mood === 'filthy' && (
          <g stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M40 40 q5 -8 0 -16 q-5 -8 0 -16" />
            <path d="M160 40 q-5 -8 0 -16 q5 -8 0 -16" />
            <path d="M100 25 q5 -8 0 -16 q-5 -8 0 -16" />
            <circle cx="35" cy="50" r="3" fill="#000" />
            <circle cx="170" cy="55" r="3" fill="#000" />
          </g>
        )}

        {/* Body */}
        <rect x="30" y="50" width="140" height="120" rx="14" ry="14"
          fill={fill} stroke="#000" strokeWidth="6" />

        {/* Feet */}
        <rect x="56" y="168" width="22" height="14" fill={fill} stroke="#000" strokeWidth="4" />
        <rect x="122" y="168" width="22" height="14" fill={fill} stroke="#000" strokeWidth="4" />

        {/* Antennae */}
        <line x1="74" y1="50" x2="62" y2="32" stroke="#000" strokeWidth="5" strokeLinecap="round" />
        <line x1="126" y1="50" x2="138" y2="32" stroke="#000" strokeWidth="5" strokeLinecap="round" />
        <circle cx="62" cy="32" r="6" fill="#000" />
        <circle cx="138" cy="32" r="6" fill="#000" />

        {/* Eyes */}
        {mood === 'happy' && (
          <g>
            {/* Curved arcs for closed-smile eyes */}
            <path d="M62 100 q14 -16 28 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M110 100 q14 -16 28 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
          </g>
        )}
        {(mood === 'content') && (
          <g>
            <circle cx="76" cy="100" r="9" fill="#000" />
            <circle cx="124" cy="100" r="9" fill="#000" />
            <circle cx="79" cy="97" r="3" fill="#fff" />
            <circle cx="127" cy="97" r="3" fill="#fff" />
          </g>
        )}
        {mood === 'bored' && (
          <g>
            {/* Half-closed: a horizontal line with small lash on top */}
            <path d="M65 100 L88 100" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <path d="M112 100 L135 100" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <text x="146" y="78" fontFamily="monospace" fontSize="22" fontWeight="900" fill="#000">z</text>
            <text x="158" y="64" fontFamily="monospace" fontSize="16" fontWeight="900" fill="#000">z</text>
          </g>
        )}
        {mood === 'sad' && (
          <g>
            {/* Droopy eyes */}
            <path d="M62 102 q14 12 28 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M110 102 q14 12 28 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* Tear */}
            <path d="M76 116 l-4 14 q4 6 8 0 z" fill="#0066FF" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
          </g>
        )}
        {mood === 'filthy' && (
          <g>
            {/* X eyes */}
            <line x1="66" y1="92" x2="86" y2="112" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <line x1="86" y1="92" x2="66" y2="112" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <line x1="114" y1="92" x2="134" y2="112" stroke="#000" strokeWidth="6" strokeLinecap="round" />
            <line x1="134" y1="92" x2="114" y2="112" stroke="#000" strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        {/* Mouth */}
        {mood === 'happy' && (
          <path d="M70 132 q30 36 60 0" stroke="#000" strokeWidth="6" fill="#FF2D9B" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {mood === 'content' && (
          <path d="M82 138 q18 14 36 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
        )}
        {mood === 'bored' && (
          <line x1="82" y1="142" x2="118" y2="142" stroke="#000" strokeWidth="6" strokeLinecap="round" />
        )}
        {mood === 'sad' && (
          <path d="M82 148 q18 -14 36 0" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
        )}
        {mood === 'filthy' && (
          <path d="M78 144 q22 -10 44 4" stroke="#000" strokeWidth="6" fill="none" strokeLinecap="round" />
        )}

        {/* Cheeks for happy */}
        {mood === 'happy' && (
          <g>
            <circle cx="56" cy="124" r="8" fill="#FF2D9B" opacity="0.8" />
            <circle cx="144" cy="124" r="8" fill="#FF2D9B" opacity="0.8" />
          </g>
        )}

        {/* Dirt smudges for filthy */}
        {mood === 'filthy' && (
          <g fill="#3a3a1a" opacity="0.7">
            <ellipse cx="60" cy="146" rx="10" ry="4" />
            <ellipse cx="140" cy="158" rx="14" ry="5" />
            <ellipse cx="100" cy="160" rx="6" ry="3" />
          </g>
        )}
      </svg>
    </div>
  )
}
