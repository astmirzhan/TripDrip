import { Tag } from './ui/Chip'
import { useI18n } from '../i18n'

/** Onboarding steps (Figma 157:1174). */
export function StepChips({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap justify-center gap-[8px]">
      <Tag selected={step === 1}>{t('steps.account')}</Tag>
      <Tag selected={step === 2}>{t('steps.verify')}</Tag>
      <Tag selected={step === 3}>{t('steps.profile')}</Tag>
    </div>
  )
}
