// Offline assistant knowledge base for Kazakhstan. Bundled with the app, works in airplane mode.
// Answers are general guidance; the app tells people to check official sources when they are online.

export interface Topic {
  id: string
  title: string
  /** Quick chip label. */
  chip?: string
  /** Words that point to this topic (English, Russian, Kazakh transliteration). */
  keywords: string[]
  steps: string[]
  /** Phrase from the phrasebook to show to a local. */
  phraseId?: string
  /** Kazakh phrase shown inline when it is not in the phrasebook. */
  say?: { kazakh: string; transcription: string; english: string }
  call?: Array<{ number: string; label: string }>
}

export const EMERGENCY = [
  { number: '112', label: 'EMERGENCY' },
  { number: '102', label: 'POLICE' },
  { number: '103', label: 'AMBULANCE' },
  { number: '101', label: 'FIRE' },
]

export const TOPICS: Topic[] = [
  {
    id: 'passport',
    title: 'I lost my passport',
    chip: 'LOST PASSPORT',
    keywords: ['passport', 'lost passport', 'stolen', 'documents', 'id', 'паспорт', 'потерял', 'украли', 'документы', 'төлқұжат'],
    steps: [
      'Call the police on 102 or go to the nearest station. Ask for a loss certificate (справка об утере).',
      'Contact your embassy in Astana or consulate in Almaty for an emergency travel document.',
      'Tell your hotel or host: they registered your stay and can confirm it.',
      'Before you fly out, ask the migration service about an exit permit with the new document.',
    ],
    say: { kazakh: 'Мен төлқұжатымды жоғалттым', transcription: 'Men tolqujatymdy zhoghalttym', english: 'I lost my passport' },
    call: [{ number: '102', label: 'POLICE' }],
  },
  {
    id: 'injury',
    title: 'Someone is hurt or sick',
    chip: 'DOCTOR',
    keywords: ['doctor', 'hurt', 'injury', 'sick', 'ill', 'hospital', 'ambulance', 'pain', 'blood', 'врач', 'больница', 'скорая', 'болит', 'травма', 'дәрігер'],
    steps: [
      'Call 103 for an ambulance, or 112 if you are not sure which service you need.',
      'Say the city, street and a landmark. Show the phrase below if they do not speak English.',
      'Pharmacies (дәріхана / аптека) are everywhere in cities, many work 24/7.',
      'Keep your passport and travel insurance details with you for the hospital.',
    ],
    phraseId: 'doctor',
    call: [{ number: '103', label: 'AMBULANCE' }],
  },
  {
    id: 'mountains',
    title: 'I am lost in the mountains or a national park',
    chip: 'LOST IN MOUNTAINS',
    keywords: ['lost', 'mountains', 'hiking', 'trail', 'kolsay', 'charyn', 'medeu', 'shymbulak', 'park', 'горы', 'заблудился', 'тропа', 'адасып'],
    steps: [
      'Stop and stay where you are if it is safe. Moving in the dark is the main risk.',
      'Call 112. Emergency calls usually work even without your own network.',
      'Share your location: open Maps, long-press your dot, read the coordinates aloud.',
      'Keep warm: nights in the Tian Shan are cold even in summer. Save phone battery.',
      'Rangers sit at park entrances (Kolsay, Charyn, Ile-Alatau). Head down a valley or along a river, not up.',
    ],
    phraseId: 'lost',
    call: [{ number: '112', label: 'EMERGENCY' }],
  },
  {
    id: 'money',
    title: 'Cards, ATMs and cash',
    chip: 'ATM & CARDS',
    keywords: ['atm', 'card', 'cash', 'money', 'visa', 'mastercard', 'pay', 'bank', 'tenge', 'kzt', 'банкомат', 'карта', 'деньги', 'наличные', 'теңге'],
    steps: [
      'The currency is the tenge (₸, KZT). Visa and Mastercard work in most shops, cafés and taxis in cities.',
      'ATMs of Halyk, Kaspi, Forte and other banks are common. Choose to be charged in tenge, not your home currency.',
      'Carry some cash for bazaars, small villages and national park entrances.',
      'Locals often pay with Kaspi QR. If a shop shows only a QR code, ask: “Картамен бола ма?” (Can I pay by card?).',
    ],
  },
  {
    id: 'exchange',
    title: 'Exchanging currency',
    keywords: ['exchange', 'currency', 'dollar', 'euro', 'rate', 'обмен', 'валюта', 'курс', 'доллар'],
    steps: [
      'Use official exchange offices (обменный пункт) in malls and on main streets. Rates are shown on a board outside.',
      'Bring clean, undamaged banknotes: torn notes are often refused.',
      'Keep the receipt. Avoid people offering to exchange money on the street.',
    ],
  },
  {
    id: 'sim',
    title: 'SIM card and mobile internet',
    chip: 'SIM CARD',
    keywords: ['sim', 'internet', 'mobile', 'data', 'wifi', 'phone', 'beeline', 'kcell', 'tele2', 'сим', 'интернет', 'связь', 'симка'],
    steps: [
      'Operators: Beeline, Kcell/Activ and Tele2/Altel. Buy a SIM in their shops or at the airport with your passport.',
      'Tourist plans with plenty of data are cheap. Ask for “туристический тариф”.',
      'If you stay longer than 30 days, your phone may need to be registered. Ask the operator when you buy the SIM.',
      'In the mountains coverage is weak: download offline maps and this app before you go.',
    ],
  },
  {
    id: 'taxi',
    title: 'Taxis',
    chip: 'TAXI',
    keywords: ['taxi', 'cab', 'uber', 'yandex', 'indrive', 'ride', 'такси', 'яндекс', 'машина'],
    steps: [
      'Use an app: Yandex Go or inDrive. The price is fixed in the app before the ride.',
      'Check the plate number before getting in. Avoid unmarked cars at the airport exit.',
      'Show the driver the address on your screen; many drivers speak Russian or Kazakh only.',
    ],
    phraseId: 'taxi',
  },
  {
    id: 'transport',
    title: 'Buses, metro and trains',
    chip: 'TRANSPORT',
    keywords: ['bus', 'metro', 'train', 'transport', 'ticket', 'onay', 'route', 'автобус', 'метро', 'поезд', 'билет', 'аялдама'],
    steps: [
      'Almaty: buses and the metro use the Onay card or a QR ticket in the Onay app. Single fares are cheap.',
      'Astana: pay in the bus with a bank card or the city transport app.',
      'Between cities: trains (Temir Zholy, tickets online or at the station) or domestic flights.',
      'Bus stops are “аялдама”. Ask a local: the phrase below helps.',
    ],
    phraseId: 'bus-stop',
  },
  {
    id: 'registration',
    title: 'Visa and registration',
    keywords: ['visa', 'registration', 'migration', 'stay', 'days', 'border', 'виза', 'регистрация', 'миграция'],
    steps: [
      'Citizens of many countries can stay without a visa for a limited time (often 30 days). Check the rules for your passport.',
      'Hotels usually register foreign guests automatically. If you stay with friends, ask your host about registration.',
      'Questions go to the migration service (migration police) in your city.',
    ],
  },
  {
    id: 'earthquake',
    title: 'Earthquake',
    keywords: ['earthquake', 'shaking', 'tremor', 'землетрясение', 'трясет', 'жер сілкінісі'],
    steps: [
      'Almaty is in a seismic zone. If the ground shakes: drop, cover under a sturdy table, hold on.',
      'Stay away from windows and glass. Do not use the lift.',
      'Outside: move to an open space away from buildings and power lines.',
      'After shaking stops, follow 112 messages and local news.',
    ],
    call: [{ number: '112', label: 'EMERGENCY' }],
  },
  {
    id: 'police',
    title: 'Talking to the police',
    keywords: ['police', 'stopped', 'fine', 'robbed', 'theft', 'scam', 'полиция', 'ограбили', 'украли', 'штраф', 'мошенник'],
    steps: [
      'Call 102. Stay calm and polite; carry your passport or a copy.',
      'Ask for an interpreter or call your embassy if you do not understand what you sign.',
      'Fines are paid at a bank or online, never in cash to an officer.',
    ],
    phraseId: 'police',
    call: [{ number: '102', label: 'POLICE' }],
  },
  {
    id: 'food',
    title: 'Food, water and tipping',
    keywords: ['food', 'water', 'restaurant', 'tip', 'tipping', 'vegetarian', 'halal', 'еда', 'вода', 'чаевые', 'ресторан'],
    steps: [
      'Tap water is generally not for drinking; buy bottled water.',
      'Many restaurants add a 10–15% service charge to the bill; otherwise a small tip is welcome.',
      'Try beshbarmak, baursak, plov and kymyz. Vegetarian options are easier to find in big cities.',
      'Most food is halal; pork is rare outside some restaurants.',
    ],
    phraseId: 'no-meat',
  },
  {
    id: 'qonaq',
    title: 'Getting help from a local',
    keywords: ['help', 'local', 'guide', 'qonaq', 'friend', 'помощь', 'местный', 'қонақ', 'көмек'],
    steps: [
      'When you are back online, open Қонақ and describe what you need. A verified local nearby accepts and a chat opens.',
      'Қонақ help is always free. If someone asks for money, report them from the chat.',
      'Meet in a public place for the first time.',
    ],
    phraseId: 'help',
  },
]

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Local intent search: scores topics by keyword hits, multi-word keywords count more. */
export function findTopics(query: string, limit = 3): Topic[] {
  const q = normalize(query)
  if (!q) return []
  const words = q.split(' ')
  const scored = TOPICS.map((topic) => {
    let score = 0
    for (const raw of topic.keywords) {
      const k = normalize(raw)
      if (k.includes(' ')) {
        if (q.includes(k)) score += 3
      } else if (words.some((w) => w === k || (w.length > 3 && (w.startsWith(k) || k.startsWith(w))))) {
        score += 2
      }
    }
    if (normalize(topic.title).includes(q)) score += 2
    return { topic, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.topic)
}
