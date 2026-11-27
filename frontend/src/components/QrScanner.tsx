import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { Notice } from './ui/Panel'
import { useI18n } from '../i18n'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike

const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector

/** Camera QR scanner on top of the built-in BarcodeDetector (Chrome, Edge, Android). */
export function QrScanner({ onResult, onClose }: { onResult: (value: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const { t } = useI18n()

  useEffect(() => {
    if (!Detector) return
    const detector = new Detector({ formats: ['qr_code'] })
    let stream: MediaStream | null = null
    let timer = 0
    let stopped = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (!video.current) return
        video.current.srcObject = s
        await video.current.play()
        const tick = async () => {
          if (stopped || !video.current) return
          try {
            const codes = await detector.detect(video.current)
            if (codes[0]?.rawValue) {
              onResult(codes[0].rawValue)
              return
            }
          } catch {
            // Frame not ready yet.
          }
          timer = window.setTimeout(tick, 250)
        }
        void tick()
      })
      .catch(() => setError(t('qr.allow')))

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onResult, t])

  return (
    <div className="flex flex-col gap-[10px]">
      <video ref={video} muted playsInline className="aspect-square w-full rounded-[12px] border-3 border-ink bg-ink object-cover" />
      {error && <Notice>{error}</Notice>}
      <Button variant="secondary" onClick={onClose}>
        {t('qr.close')}
      </Button>
    </div>
  )
}
