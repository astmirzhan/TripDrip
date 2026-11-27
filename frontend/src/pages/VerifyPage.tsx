import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { keys, useMyVerification, useSubmitVerification } from '../api/hooks'
import type { Verification } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { SceneScreen } from '../components/Layout'
import { StepChips } from '../components/StepChips'
import { Button, ButtonLink } from '../components/ui/Button'
import { Tag } from '../components/ui/Chip'
import { Input } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { Notice, Panel } from '../components/ui/Panel'
import { cn } from '../lib/cn'
import { useI18n, type T } from '../i18n'

function UploadBox({ label, file, onFile, emptyTitle, emptyHint, capture, replaceLabel }: {
  replaceLabel: string
  label: string
  file: File | null
  onFile: (f: File) => void
  emptyTitle: string
  emptyHint: string
  capture?: 'user'
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
      <p className="label text-ink">{label}</p>
      <label
        className={cn(
          'flex h-[150px] cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[12px] border-3 border-ink p-[12px] text-center focus-within:outline-3 focus-within:outline-link-blue',
          file ? 'bg-mint' : 'border-dashed bg-mist',
        )}
      >
        <input
          type="file"
          accept="image/*"
          capture={capture}
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Icon name={file ? 'check' : 'camera'} size={32} />
        <span className="max-w-full truncate font-body text-[18px] font-bold text-ink">{file ? file.name : emptyTitle}</span>
        <span className="font-body text-[16px] text-ink-soft">{file ? replaceLabel : emptyHint}</span>
      </label>
    </div>
  )
}

type Step = { tone: 'done' | 'active' | 'todo' | 'failed'; title: string; hint?: string }

function steps(v: Verification | null | undefined, t: T): Step[] {
  if (!v) {
    return [
      { tone: 'todo', title: t('verify.stepUploaded') },
      { tone: 'todo', title: t('verify.stepReview'), hint: t('verify.stepReviewHint') },
      { tone: 'todo', title: t('verify.stepResult') },
    ]
  }
  if (v.status === 'pending') {
    return [
      { tone: 'done', title: t('verify.stepUploaded') },
      { tone: 'active', title: t('verify.stepReview'), hint: t('verify.stepReviewHint') },
      { tone: 'todo', title: t('verify.stepResult') },
    ]
  }
  return [
    { tone: 'done', title: t('verify.stepUploaded') },
    { tone: 'done', title: t('verify.stepReviewed') },
    v.status === 'approved'
      ? { tone: 'done', title: t('verify.stepConfirmed') }
      : { tone: 'failed', title: t('verify.stepDeclined'), hint: v.rejection_reason ?? t('verify.uploadAgain') },
  ]
}

const DOT = { done: 'bg-leaf', active: 'bg-yellow', todo: 'bg-white', failed: 'bg-danger' }

// 03 Verify (Figma 159:1693).
export function VerifyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useI18n()
  const verification = useMyVerification()
  const submit = useSubmitVerification()
  const [docNumber, setDocNumber] = useState('')
  const [docPhoto, setDocPhoto] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [error, setError] = useState('')

  const isLocal = user?.role === 'local'
  const v = verification.data
  const canSubmit = !v || v.status === 'rejected'
  const approved = user?.is_verified || v?.status === 'approved'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!docPhoto || !selfie) {
      setError(t('verify.needPhotos'))
      return
    }
    try {
      // The backend stores only references; file storage is out of MVP scope (see idea.md §3.1).
      const result = await submit.mutateAsync({
        doc_type: isLocal ? 'iin' : 'passport',
        doc_number: docNumber.trim(),
        doc_photo_url: `upload://${docPhoto.name}`,
        selfie_url: `upload://${selfie.name}`,
      })
      if (result.status === 'approved') {
        // Demo mode on the backend approves right away: refresh the session and go on.
        await qc.invalidateQueries({ queryKey: keys.me })
        navigate('/profile')
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <SceneScreen sprites={[{ kind: 'yurt', x: 40, width: 115.2 }, { kind: 'yurt', x: 1260, width: 115.2 }]}>
      <Panel className="w-full max-w-[980px] p-[20px] sm:p-[28px]">
        <form onSubmit={onSubmit} className="flex flex-col gap-[16px]">
          <h1 className="text-center font-display text-[44px] leading-none text-ink sm:text-[52px]">{t('verify.title')}</h1>
          <p className="text-center font-body text-[18px] text-ink-soft sm:text-[20px]">
            {t('verify.intro')}
          </p>
          <StepChips step={2} />
          <div className="flex flex-wrap justify-center gap-[8px]">
            <Tag selected={!isLocal}>{t('verify.guestPassport')}</Tag>
            <Tag selected={isLocal} cyr>
              {t('verify.localIin')}
            </Tag>
          </div>
          <div className="flex flex-col gap-[20px] lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
              <Input
                label={isLocal ? t('verify.iin') : t('verify.passportNumber')}
                placeholder={isLocal ? '990101300123' : '22FR48193'}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                inputMode={isLocal ? 'numeric' : 'text'}
                maxLength={isLocal ? 12 : 20}
                required
                disabled={!canSubmit}
              />
              <div className="flex flex-col gap-[14px] sm:flex-row">
                <UploadBox
                  label={isLocal ? t('verify.idPhoto') : t('verify.passportPhoto')}
                  file={docPhoto}
                  onFile={setDocPhoto}
                  emptyTitle={t('verify.addPhoto')}
                  emptyHint={t('verify.addPhotoHint')}
                  replaceLabel={t('verify.replace')}
                />
                <UploadBox
                  label={t('verify.selfie')}
                  file={selfie}
                  onFile={setSelfie}
                  emptyTitle={t('verify.takeSelfie')}
                  emptyHint={t('verify.selfieHint')}
                  replaceLabel={t('verify.replace')}
                  capture="user"
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-[14px] lg:w-[330px]">
              <div className="flex flex-col gap-[12px] rounded-[12px] border-3 border-ink bg-white p-[16px]">
                <p className="label text-leaf">{t('verify.status')}</p>
                {steps(v, t).map((s) => (
                  <div key={s.title} className="flex gap-[10px]">
                    <span className={cn('mt-[3px] size-[14px] shrink-0 rounded-[3px] border-3 border-ink', DOT[s.tone])} />
                    <div className="flex flex-col gap-[2px]">
                      <p className={cn('font-body', s.tone === 'active' ? 'text-[18px] font-bold text-ink' : 'text-[16px]', s.tone === 'todo' ? 'text-ink-soft' : 'text-ink')}>
                        {s.title}
                      </p>
                      {s.hint && <p className="font-body text-[16px] text-ink-soft">{s.hint}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-[8px] rounded-[12px] border-3 border-ink bg-cream p-[16px]">
                <div className="flex items-center gap-[8px]">
                  <Icon name="lock" size={22} />
                  <p className="label text-ink">{t('verify.keptSafe')}</p>
                </div>
                <p className="font-body text-[16px] text-ink">
                  {t('verify.keptSafeText')}
                </p>
              </div>
            </div>
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap justify-center gap-[16px]">
            {approved ? (
              <Button type="button" onClick={() => navigate('/profile')}>
                {t('common.continue')}
              </Button>
            ) : (
              <Button type="submit" loading={submit.isPending} disabled={!canSubmit}>
                {t('verify.send')}
              </Button>
            )}
            <ButtonLink to="/phrasebook" variant="secondary">
              {t('common.openPhrasebook')}
            </ButtonLink>
          </div>
        </form>
      </Panel>
    </SceneScreen>
  )
}
