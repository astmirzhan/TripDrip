// Mirrors backend/internal/transport/http/dto and sqlc row types (JSON field names).

export type Role = 'tourist' | 'local' | 'partner' | 'admin'
export type Vibe = 'nature' | 'megapolis' | 'both'
export type TripPurpose = 'leisure' | 'work' | 'study' | 'family'
export type HelpType = 'directions' | 'translation_call' | 'city_tour' | 'dastarkhan' | 'host_stay'
export type HelpStatus = 'open' | 'has_responses' | 'matched' | 'completed' | 'cancelled' | 'expired'
export type Decision = 'pending' | 'accepted' | 'declined'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export interface LanguageSkill {
  code: string
  level: string
}

export interface User {
  id: string
  role: Role
  first_name: string
  last_name: string
  country_code: string
  email?: string
  phone?: string
  avatar_url?: string
  is_verified: boolean
  is_banned: boolean
  trip_purpose?: TripPurpose
  trip_start_date?: string
  trip_end_date?: string
  vibe_preference: Vibe
  hobbies: string[]
  languages: LanguageSkill[]
  city: string
  district?: string
  expectations?: string
  ready_for_networking: boolean
  can_host_guests: boolean
  qonaq_completed_count: number
  rating_avg: string
  rating_count: number
  created_at: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface RegisterRequest {
  first_name: string
  last_name: string
  country_code: string
  email?: string
  phone?: string
  password: string
  city: string
  district?: string
  pd_consent: boolean
  rules_consent: boolean
}

export interface LoginRequest {
  email?: string
  phone?: string
  password: string
}

export interface ProfileUpdate {
  trip_purpose?: TripPurpose
  trip_start_date?: string
  trip_end_date?: string
  vibe_preference?: Vibe
  hobbies?: string[]
  languages?: LanguageSkill[]
  city?: string
  district?: string
  expectations?: string
  ready_for_networking?: boolean
  can_host_guests?: boolean
  avatar_url?: string
}

export interface Verification {
  id: string
  user_id: string
  doc_type: 'passport' | 'iin'
  doc_photo_url?: string
  selfie_url?: string
  status: VerificationStatus
  rejection_reason?: string
  created_at: string
  reviewed_at?: string
}

export interface SubmitVerification {
  doc_type: 'passport' | 'iin'
  doc_number: string
  doc_photo_url: string
  selfie_url: string
}

export interface MapPerson {
  user_id: string
  role: Role
  first_name: string
  last_name: string
  country_code: string
  avatar_url?: string
  vibe_preference: Vibe
  hobbies: string[]
  languages: LanguageSkill[]
  expectations?: string
  ready_for_networking: boolean
  can_host_guests: boolean
  qonaq_completed_count: number
  rating_avg: string
  rating_count: number
  city: string
  district?: string
  approx_lat: number
  approx_lng: number
}

export interface MapPartner {
  partner_id: string
  brand_name: string
  category: string
  logo_url?: string
  location_id: string
  branch_name: string
  city: string
  address: string
  lat: number
  lng: number
  point_id: string
  vibe: string
  reward_coins: number
  is_boosted: boolean
}

export interface MapEntities {
  people: MapPerson[]
  partners: MapPartner[]
}

export type MapLayer = 'tourists' | 'locals_networking' | 'locals_hosting' | 'partners'

export interface MapFilter {
  layer?: MapLayer
  city?: string
  hobby?: string
  language?: string
  vibe?: string
  country?: string
}

export interface MapPresence {
  user_id: string
  city: string
  district?: string
  approx_lat: number
  approx_lng: number
  is_visible: boolean
  hidden_by_moderation: boolean
  visible_until?: string
  updated_at: string
}

export interface HelpRequest {
  id: string
  tourist_id: string
  target_local_id: string | null
  selected_local_id: string | null
  help_type: HelpType
  description: string
  city: string
  district: string | null
  needed_at: string
  people_count: number
  status: HelpStatus
  tourist_confirmed_done: boolean
  local_confirmed_done: boolean
  expires_at: string
  created_at: string
  updated_at: string
}

export interface FeedItem extends HelpRequest {
  tourist_first_name: string
  tourist_last_name: string
  tourist_country_code: string
  tourist_avatar_url: string | null
}

export interface HelpResponse {
  id: string
  request_id: string
  local_id: string
  decision: Decision
  message: string | null
  created_at: string
  first_name: string
  last_name: string
  avatar_url: string | null
  rating_avg: number | string | null
  rating_count: number
  qonaq_completed_count: number
  /** Raw JSONB bytes; Go encodes []byte as base64. */
  languages: string | LanguageSkill[] | null
}

export interface CreateQonaqRequest {
  target_local_id?: string
  help_type: HelpType
  description: string
  city: string
  district?: string
  needed_at: string
  people_count: number
}

export interface RouteStop {
  point_id: string
  stop_order: number
  point_type: 'landmark' | 'partner'
  partner_location_id?: string
  name: string
  description?: string
  city: string
  vibe: string
  lat: number
  lng: number
  radius_meters: number
  reward_coins: number
  is_boosted: boolean
  is_visited: boolean
  visited_at?: string
}

export interface Route {
  id: string
  user_id: string
  city: string
  origin_lat: number
  origin_lng: number
  dest_lat: number
  dest_lng: number
  vibe_preference: Vibe
  status: 'active' | 'completed' | 'abandoned'
  completion_reward_coins: number
  stops: RouteStop[]
  created_at: string
  completed_at?: string
}

export interface GenerateRoute {
  city: string
  origin_lat: number
  origin_lng: number
  dest_lat: number
  dest_lng: number
  vibe_preference: Vibe
}

export interface CheckinResult {
  checkin_id: string
  coins_awarded: number
  route_completed: boolean
  route_bonus: number
  new_balance: number
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  reason: string
  reference_id: string | null
  idempotency_key: string
  created_at: string
}

export interface Wallet {
  balance: number
  updated_at: string
  transactions: CoinTransaction[]
}

export interface Offer {
  id: string
  partner_id: string
  title: string
  description: string | null
  discount_percent: number
  coin_cost: number
  total_limit: number
  remaining_limit: number
  created_at: string
  brand_name: string
  category: string
  logo_url: string | null
}

export interface PromoCode {
  id: string
  code: string
  offer_id: string
  user_id: string
  status: 'active' | 'redeemed' | 'expired'
  expires_at: string
  redeemed_at: string | null
  created_at: string
}

export interface MyPromoCode extends PromoCode {
  offer_title: string
  discount_percent: number
  coin_cost: number
  partner_id: string
  brand_name: string
  logo_url: string | null
}

export interface NetworkRequest {
  id: string
  sender_id: string
  receiver_id: string
  intro_message: string | null
  status: Decision
  created_at: string
  responded_at: string | null
}

export interface Items<T> {
  items: T[]
}
