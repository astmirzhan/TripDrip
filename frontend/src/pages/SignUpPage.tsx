import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { SceneScreen } from '../components/Layout'
import { Button } from '../components/ui/Button'
import { StepChips } from '../components/StepChips'
import { Input, Select } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { Notice, Panel } from '../components/ui/Panel'
import { Checkbox } from '../components/ui/Toggle'
import { cn } from '../lib/cn'
import { CITIES, COUNTRIES } from '../lib/data'
import { useI18n } from '../i18n'
import { cityLabel, countryLabel } from '../lib/places'

const contact = (value: string) => (value.includes('@') ? { email: value.trim() } : { phone: value.replace(/[\s()-]/g, '') })

// 02 Sign up (Figma 157:1172). Login reuses the same panel.
export function SignUpPage({ mode }: { mode: 'signup' | 'login' }) {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const [form, setForm] = useState({ firstName: '', lastName: '', country: '', city: 'Almaty', contact: '', password: '' })
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'
  const isLocal = form.country === 'KZ'

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (isSignup && !consent) {
      setError(t('auth.consentError'))
      return
    }
    setBusy(true)
    try {
      if (isSignup) {
        await register({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          country_code: form.country,
          city: form.city,
          password: form.password,
          pd_consent: consent,
          rules_consent: consent,
          ...contact(form.contact),
        })
        navigate('/verify')
      } else {
        const user = await login({ password: form.password, ...contact(form.contact) })
        navigate(user.is_verified ? '/home' : '/verify')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SceneScreen sprites={[{ kind: 'yurt', x: 70 }, { kind: 'baiterek', x: 1250 }]}>
      <Panel className={cn('w-full gap-[16px] p-[20px] sm:p-[28px]', isSignup ? 'max-w-[640px]' : 'max-w-[460px]')}>
        <form onSubmit={submit} className="flex flex-col gap-[16px]">
          <h1 className="text-center font-display text-[44px] leading-none text-ink sm:text-[52px]">
            {isSignup ? t('auth.createTitle') : t('auth.welcomeBack')}
          </h1>
          {isSignup && (
            <>
              <StepChips step={1} />
              <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                <Input label={t('auth.firstName')} placeholder="Emma" value={form.firstName} onChange={set('firstName')} required autoComplete="given-name" />
                <Input label={t('auth.lastName')} placeholder="Laurent" value={form.lastName} onChange={set('lastName')} required autoComplete="family-name" />
              </div>
              <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                <Select label={t('auth.country')} value={form.country} onChange={set('country')} required>
                  <option value="" disabled>
                    {t('auth.choose')}
                  </option>
                  {COUNTRIES.map(([code]) => (
                    <option key={code} value={code}>
                      {countryLabel(code, lang)}
                    </option>
                  ))}
                </Select>
                <Select label={isLocal ? t('auth.city') : t('auth.cityNow')} value={form.city} onChange={set('city')} required>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {cityLabel(c, lang)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-[10px] rounded-[10px] border-3 border-ink bg-mint p-[12px]">
                <Icon name="people" />
                <p className="flex-1 font-body text-[16px] text-ink">
                  {isLocal ? t('auth.joinLocal') : t('auth.joinGuest')}
                </p>
              </div>
            </>
          )}
          <div className={cn('grid grid-cols-1 gap-[16px]', isSignup && 'sm:grid-cols-2')}>
            <Input
              label={t('auth.contact')}
              placeholder="emma.laurent@mail.fr"
              value={form.contact}
              onChange={set('contact')}
              required
              autoComplete="username"
            />
            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••••"
              value={form.password}
              onChange={set('password')}
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>
          {isSignup && (
            <Checkbox checked={consent} onChange={setConsent}>
              {t('auth.consent')}
            </Checkbox>
          )}
          {error && <Notice>{error}</Notice>}
          <div className={cn('flex items-center justify-center gap-[16px] pt-[6px]', isSignup ? 'flex-wrap' : 'flex-col')}>
            <Button type="submit" loading={busy}>
              {isSignup ? t('auth.createTitle') : t('auth.signIn')}
            </Button>
            <Link to={isSignup ? '/login' : '/signup'} className="font-body text-[18px] font-bold text-leaf">
              {isSignup ? t('auth.haveAccount') : t('auth.createLink')}
            </Link>
          </div>
        </form>
      </Panel>
    </SceneScreen>
  )
}
