// UI/Sign (Figma 32:672): wooden sign. Geometry below is the 1x master (120 × 95); screens use 1.2x and 1.6x.
export function Sign({ value, caption, scale = 1.2 }: { value: string | number; caption: string; scale?: number }) {
  const s = (n: number) => `${n * scale}px`
  return (
    <div className="relative shrink-0" style={{ width: s(120), height: s(95) }}>
      {[20, 92].map((left) => (
        <div
          key={left}
          className="absolute border-ink bg-wood-dark"
          style={{ left: s(left), top: s(48), width: s(8), height: s(47), borderWidth: s(1.5) }}
        />
      ))}
      <div
        className="absolute left-0 top-0 border-ink bg-wood"
        style={{ width: s(120), height: s(56), borderWidth: s(2), borderRadius: s(4), boxShadow: `0 ${s(3)} 0 0 #2e1b5b` }}
      />
      {[18, 36].map((top) => (
        <div key={top} className="absolute bg-wood-dark" style={{ left: s(4), top: s(top), width: s(112), height: s(1.5) }} />
      ))}
      <p
        className="absolute left-0 w-full text-center font-display leading-none text-yellow"
        style={{ top: s(6), fontSize: s(22), textShadow: `0 ${s(2)} 0 #2e1b5b` }}
      >
        {value}
      </p>
      <p
        className="absolute left-0 w-full text-center font-body font-bold leading-[1.2] text-white uppercase"
        style={{ top: s(36), fontSize: s(7), letterSpacing: s(0.42) }}
      >
        {caption}
      </p>
    </div>
  )
}
