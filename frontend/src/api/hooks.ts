import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from './client'
import type {
  ChatSummary,
  CheckinResult,
  Chat,
  CreateQonaqRequest,
  Decision,
  FeedItem,
  GenerateRoute,
  HelpRequest,
  HelpResponse,
  Items,
  MapEntities,
  MapFilter,
  MapPresence,
  Message,
  MyPromoCode,
  NetworkRequest,
  NetworkRequestRow,
  Offer,
  ProfileUpdate,
  PromoCode,
  Route,
  SubmitVerification,
  User,
  Verification,
  Wallet,
} from './types'

export const keys = {
  me: ['me'] as const,
  verification: ['verification'] as const,
  wallet: ['wallet'] as const,
  route: ['route', 'active'] as const,
  myRequests: ['qonaq', 'mine'] as const,
  responses: (id: string) => ['qonaq', 'responses', id] as const,
  feed: (city?: string) => ['qonaq', 'feed', city ?? ''] as const,
  map: (filter: MapFilter) => ['map', filter] as const,
  offers: ['offers'] as const,
  promos: ['promos'] as const,
  chats: ['chats'] as const,
  messages: (id: string) => ['chats', id, 'messages'] as const,
  network: ['network-requests'] as const,
}

/** Returns null instead of throwing when the backend answers 404 (no record yet). */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

const isVerifiedGate = (error: unknown) => error instanceof ApiError && error.status === 403

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api<User>('/me'), enabled, retry: false })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileUpdate) => api<User>('/me/profile', { method: 'PATCH', body }),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  })
}

export function useMyVerification(enabled = true) {
  return useQuery({
    queryKey: keys.verification,
    queryFn: () => orNull(api<Verification>('/verifications/me')),
    enabled,
  })
}

export function useSubmitVerification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitVerification) => api<Verification>('/verifications', { method: 'POST', body }),
    onSuccess: (v) => qc.setQueryData(keys.verification, v),
  })
}

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: keys.wallet,
    queryFn: () => api<Wallet>('/wallet', { query: { limit: 20 } }),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useActiveRoute(enabled = true) {
  return useQuery({
    queryKey: keys.route,
    queryFn: () => orNull(api<Route>('/routes/active')),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useGenerateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateRoute) => api<Route>('/routes/generate', { method: 'POST', body }),
    onSuccess: (route) => qc.setQueryData(keys.route, route),
  })
}

export function useCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ routeId, pointId, lat, lng }: { routeId: string; pointId: string; lat: number; lng: number }) =>
      api<CheckinResult>(`/routes/${routeId}/stops/${pointId}/checkin`, {
        method: 'POST',
        body: { user_lat: lat, user_lng: lng },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.route })
      qc.invalidateQueries({ queryKey: keys.wallet })
    },
  })
}

export function useMyQonaqRequests(enabled = true) {
  return useQuery({
    queryKey: keys.myRequests,
    queryFn: () => api<Items<HelpRequest>>('/qonaq/requests/me').then((r) => r.items),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useQonaqResponses(requestId: string | null) {
  return useQuery({
    queryKey: keys.responses(requestId ?? ''),
    queryFn: () => api<Items<HelpResponse>>(`/qonaq/requests/${requestId}/responses`).then((r) => r.items),
    enabled: !!requestId,
  })
}

export function useCreateQonaqRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateQonaqRequest) => api<HelpRequest>('/qonaq/requests', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myRequests }),
  })
}

export function useSelectHost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, localId }: { requestId: string; localId: string }) =>
      api<{ help_request: HelpRequest; chat: Chat }>(`/qonaq/requests/${requestId}/select-host`, {
        method: 'POST',
        body: { local_id: localId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qonaq'] })
      qc.invalidateQueries({ queryKey: keys.chats })
    },
  })
}

export function useConfirmQonaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => api<unknown>(`/qonaq/requests/${requestId}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qonaq'] })
      qc.invalidateQueries({ queryKey: keys.wallet })
    },
  })
}

export function useReviewQonaq() {
  return useMutation({
    mutationFn: ({ requestId, rating }: { requestId: string; rating: number }) =>
      api<unknown>(`/qonaq/requests/${requestId}/reviews`, { method: 'POST', body: { rating } }),
  })
}

export function useQonaqFeed(city: string | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.feed(city),
    queryFn: () => api<Items<FeedItem>>('/qonaq/feed', { query: { city } }).then((r) => r.items),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useRespondQonaq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: Exclude<Decision, 'pending'> }) =>
      api<unknown>(`/qonaq/requests/${requestId}/respond`, { method: 'POST', body: { decision } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qonaq', 'feed'] }),
  })
}

export function useMapEntities(filter: MapFilter, enabled = true) {
  return useQuery({
    queryKey: keys.map(filter),
    queryFn: () => api<MapEntities>('/map/entities', { query: { ...filter } }),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useUpdatePresence() {
  return useMutation({
    mutationFn: (body: { city: string; district?: string; is_visible: boolean }) =>
      api<MapPresence>('/me/map-presence', { method: 'PATCH', body }),
  })
}

export function useSendNetworkRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { receiver_id: string; intro_message?: string }) =>
      api<NetworkRequest>('/network-requests', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.network }),
  })
}

export function useNetworkRequests(enabled = true) {
  return useQuery({
    queryKey: keys.network,
    queryFn: () => api<Items<NetworkRequestRow>>('/network-requests').then((r) => r.items),
    enabled,
    refetchInterval: 15_000,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useRespondNetwork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: Exclude<Decision, 'pending'> }) =>
      api<{ request: NetworkRequest; chat?: Chat }>(`/network-requests/${requestId}/respond`, {
        method: 'POST',
        body: { decision },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.network })
      qc.invalidateQueries({ queryKey: keys.chats })
    },
  })
}

export function useChats(enabled = true) {
  return useQuery({
    queryKey: keys.chats,
    queryFn: () => api<Items<ChatSummary>>('/chats').then((r) => r.items),
    enabled,
    refetchInterval: 10_000,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

/** Messages oldest → newest. Polls while the chat is open. */
export function useMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: keys.messages(chatId ?? ''),
    queryFn: () =>
      api<Items<Message>>(`/chats/${chatId}/messages`, { query: { limit: 100 } }).then((r) => [...r.items].reverse()),
    enabled: !!chatId,
    refetchInterval: 4_000,
  })
}

export function useSendMessage(chatId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api<Message>(`/chats/${chatId}/messages`, { method: 'POST', body: { body } }),
    onSuccess: (msg) => {
      qc.setQueryData<Message[]>(keys.messages(chatId), (list) => [...(list ?? []), msg])
      qc.invalidateQueries({ queryKey: keys.chats })
    },
  })
}

export function useReport() {
  return useMutation({
    mutationFn: (body: { target_user_id: string; reason: string; details?: string }) =>
      api<unknown>('/reports', { method: 'POST', body }),
  })
}

export function useBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (blockedId: string) => api<unknown>('/blocks', { method: 'POST', body: { blocked_id: blockedId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['map'] }),
  })
}

export function useOffers() {
  return useQuery({
    queryKey: keys.offers,
    queryFn: () => api<Items<Offer>>('/offers', { auth: false }).then((r) => r.items),
  })
}

export function useMyPromoCodes(enabled = true) {
  return useQuery({
    queryKey: keys.promos,
    queryFn: () => api<Items<MyPromoCode>>('/promocodes/me').then((r) => r.items),
    enabled,
    retry: (count, error) => !isVerifiedGate(error) && count < 2,
  })
}

export function useExchangeOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (offerId: string) =>
      api<PromoCode>(`/offers/${offerId}/exchange`, {
        method: 'POST',
        body: { idempotency_key: crypto.randomUUID() },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.promos })
      qc.invalidateQueries({ queryKey: keys.wallet })
    },
  })
}
