import { Tag } from './ui/Chip'

/** Onboarding steps (Figma 157:1174). */
export function StepChips({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-wrap justify-center gap-[8px]">
      <Tag selected={step === 1}>1 ACCOUNT</Tag>
      <Tag selected={step === 2}>2 VERIFY</Tag>
      <Tag selected={step === 3}>3 PROFILE</Tag>
    </div>
  )
}
