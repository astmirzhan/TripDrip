import { useAuth } from '../auth/AuthContext'
import { AppScreen } from '../components/Layout'
import { VerifyGate } from '../components/VerifyGate'
import { QonaqFeed } from './qonaq/QonaqFeed'
import { QonaqRequestForm } from './qonaq/QonaqRequestForm'

/** Tourists ask for help (08), locals see the feed (09). */
export function QonaqPage() {
  const { user } = useAuth()
  const isLocal = user?.role === 'local'
  return (
    <AppScreen sprites={isLocal ? [] : [{ kind: 'yurt', x: 1250, width: 115.2 }]}>
      <VerifyGate>{isLocal ? <QonaqFeed /> : <QonaqRequestForm />}</VerifyGate>
    </AppScreen>
  )
}
