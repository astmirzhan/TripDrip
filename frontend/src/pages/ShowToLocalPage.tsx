import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SceneScreen } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { Eyebrow, Panel } from '../components/ui/Panel'
import { findPhrase, speak } from '../features/phrasebook/phrases'

// 07 Show to a local (Figma 160:4179): large, high-contrast text for the person you talk to.
export function ShowToLocalPage() {
  const { phraseId = '' } = useParams()
  const navigate = useNavigate()
  const phrase = findPhrase(phraseId)
  if (!phrase) return <Navigate to="/phrasebook" replace />

  return (
    <SceneScreen
      sprites={[
        { kind: 'baiterek', x: 1200 },
        { kind: 'yurt', x: 90 },
        { kind: 'yurt', x: 1010, width: 100.8 },
      ]}
    >
      <Panel className="w-full max-w-[940px] items-center gap-[18px] p-[24px] text-center sm:p-[40px]">
        <Eyebrow>SHOW THIS TO A LOCAL</Eyebrow>
        <p className="font-body text-[20px] text-ink-soft">{phrase.english}</p>
        <p lang="kk" className="w-full font-cyr text-[44px] leading-tight break-words text-ink sm:text-[72px]">
          {phrase.kazakh}
        </p>
        <p className="font-body text-[24px] font-bold text-link-blue">{phrase.transcription}</p>
        <p lang="ru" className="font-cyr text-[25px] text-ink-soft">
          {phrase.russian}
        </p>
        <div className="flex flex-wrap justify-center gap-[16px] pt-[10px]">
          <Button variant="secondary" onClick={() => speak(phrase)}>
            listen
          </Button>
          <Button onClick={() => navigate('/phrasebook')}>close</Button>
        </div>
      </Panel>
    </SceneScreen>
  )
}
