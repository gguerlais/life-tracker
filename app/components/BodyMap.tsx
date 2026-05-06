'use client'

type BodyMapProps = {
  volumes: Record<string, number>
}

const getColor = (volume: number, maxVolume: number): string => {
  if (!volume || !maxVolume) return '#2c2c2e'
  const ratio = volume / maxVolume
  if (ratio < 0.15) return '#1a3a2e'
  if (ratio < 0.3) return '#1b6b3a'
  if (ratio < 0.5) return '#30d158'
  if (ratio < 0.7) return '#ff9f0a'
  if (ratio < 0.85) return '#ff6b35'
  return '#ff453a'
}

export default function BodyMap({ volumes }: BodyMapProps) {
  const maxVolume = Math.max(...Object.values(volumes), 1)
  const c = (group: string) => getColor(volumes[group] || 0, maxVolume)

  return (
    <div className="flex justify-center gap-6">
      {/* FACE */}
      <div className="text-center">
        <p className="text-[10px] text-[var(--text-tertiary)] mb-2">Face</p>
        <svg viewBox="0 0 200 400" width="130" height="280">
          <ellipse cx="100" cy="28" rx="20" ry="24" fill="#1c1c1e" stroke="#3a3a3c" strokeWidth="1" />
          <rect x="93" y="50" width="14" height="12" rx="4" fill="#1c1c1e" />

          <ellipse cx="56" cy="78" rx="22" ry="13" fill={c('Épaules')} stroke="#3a3a3c" strokeWidth="0.5" rx-label="Épaules" />
          <ellipse cx="144" cy="78" rx="22" ry="13" fill={c('Épaules')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="70" y="70" width="60" height="42" rx="8" fill={c('Pectoraux')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="30" y="88" width="22" height="48" rx="10" fill={c('Biceps')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="148" y="88" width="22" height="48" rx="10" fill={c('Biceps')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="24" y="140" width="18" height="48" rx="8" fill={c('Avant-bras')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="158" y="140" width="18" height="48" rx="8" fill={c('Avant-bras')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="78" y="116" width="44" height="54" rx="6" fill={c('Abdominaux')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="68" y="178" width="26" height="72" rx="12" fill={c('Quadriceps')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="106" y="178" width="26" height="72" rx="12" fill={c('Quadriceps')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="70" y="258" width="22" height="58" rx="10" fill={c('Mollets')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="108" y="258" width="22" height="58" rx="10" fill={c('Mollets')} stroke="#3a3a3c" strokeWidth="0.5" />
        </svg>
      </div>

      {/* DOS */}
      <div className="text-center">
        <p className="text-[10px] text-[var(--text-tertiary)] mb-2">Dos</p>
        <svg viewBox="0 0 200 400" width="130" height="280">
          <ellipse cx="100" cy="28" rx="20" ry="24" fill="#1c1c1e" stroke="#3a3a3c" strokeWidth="1" />
          <rect x="93" y="50" width="14" height="12" rx="4" fill="#1c1c1e" />

          <polygon points="82,62 118,62 144,78 56,78" fill={c('Trapèzes')} stroke="#3a3a3c" strokeWidth="0.5" />

          <ellipse cx="56" cy="78" rx="22" ry="13" fill={c('Épaules')} stroke="#3a3a3c" strokeWidth="0.5" />
          <ellipse cx="144" cy="78" rx="22" ry="13" fill={c('Épaules')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="70" y="70" width="60" height="50" rx="8" fill={c('Dos')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="30" y="88" width="22" height="48" rx="10" fill={c('Triceps')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="148" y="88" width="22" height="48" rx="10" fill={c('Triceps')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="78" y="124" width="44" height="34" rx="6" fill={c('Lombaires')} stroke="#3a3a3c" strokeWidth="0.5" />

          <ellipse cx="84" cy="178" rx="16" ry="18" fill={c('Fessiers')} stroke="#3a3a3c" strokeWidth="0.5" />
          <ellipse cx="116" cy="178" rx="16" ry="18" fill={c('Fessiers')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="68" y="200" width="26" height="55" rx="12" fill={c('Ischio-jambiers')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="106" y="200" width="26" height="55" rx="12" fill={c('Ischio-jambiers')} stroke="#3a3a3c" strokeWidth="0.5" />

          <rect x="70" y="262" width="22" height="55" rx="10" fill={c('Mollets')} stroke="#3a3a3c" strokeWidth="0.5" />
          <rect x="108" y="262" width="22" height="55" rx="10" fill={c('Mollets')} stroke="#3a3a3c" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  )
}