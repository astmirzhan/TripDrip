// Offline phrasebook data: bundled with the app, no network needed.

export type Topic = 'basics' | 'where' | 'directions' | 'food' | 'hotel' | 'transport' | 'emergency'

export interface Phrase {
  id: string
  topic: Topic
  english: string
  kazakh: string
  transcription: string
  russian: string
}

export const TOPICS: Array<{ value: Topic; label: string }> = [
  { value: 'basics', label: 'BASICS' },
  { value: 'where', label: 'WHERE AM I' },
  { value: 'directions', label: 'DIRECTIONS' },
  { value: 'food', label: 'FOOD' },
  { value: 'hotel', label: 'HOTEL' },
  { value: 'transport', label: 'TRANSPORT' },
]

export const PHRASES: Phrase[] = [
  { id: 'hello', topic: 'basics', english: 'Hello', kazakh: 'Сәлеметсіз бе', transcription: 'Salemetsiz be', russian: 'Здравствуйте' },
  { id: 'thanks', topic: 'basics', english: 'Thank you', kazakh: 'Рақмет', transcription: 'Rakhmet', russian: 'Спасибо' },
  { id: 'help', topic: 'emergency', english: 'Please help me', kazakh: 'Көмектесіңізші', transcription: 'Komektesinizshi', russian: 'Помогите, пожалуйста' },
  { id: 'bus-stop', topic: 'transport', english: 'Where is the bus stop?', kazakh: 'Автобус аялдамасы қайда?', transcription: 'Avtobus ayaldamasy qayda?', russian: 'Где остановка автобуса?' },
  { id: 'price', topic: 'food', english: 'How much is this?', kazakh: 'Бұл қанша тұрады?', transcription: 'Bul qansha turady?', russian: 'Сколько это стоит?' },
  { id: 'lost', topic: 'where', english: 'I am lost', kazakh: 'Мен адасып қалдым', transcription: 'Men adasyp qaldym', russian: 'Я заблудился' },
  { id: 'yes', topic: 'basics', english: 'Yes', kazakh: 'Иә', transcription: 'Iya', russian: 'Да' },
  { id: 'no', topic: 'basics', english: 'No', kazakh: 'Жоқ', transcription: 'Zhoq', russian: 'Нет' },
  { id: 'sorry', topic: 'basics', english: 'Excuse me', kazakh: 'Кешіріңіз', transcription: 'Keshiriniz', russian: 'Извините' },
  { id: 'no-kazakh', topic: 'basics', english: 'I don’t speak Kazakh', kazakh: 'Мен қазақша сөйлемеймін', transcription: 'Men qazaqsha soilemeimin', russian: 'Я не говорю по-казахски' },
  { id: 'english', topic: 'basics', english: 'Do you speak English?', kazakh: 'Ағылшынша сөйлейсіз бе?', transcription: 'Aghylshynsha soileisiz be?', russian: 'Вы говорите по-английски?' },
  { id: 'where-am-i', topic: 'where', english: 'Where am I?', kazakh: 'Мен қайдамын?', transcription: 'Men qaidamyn?', russian: 'Где я нахожусь?' },
  { id: 'show-map', topic: 'where', english: 'Show me on the map', kazakh: 'Картадан көрсетіңізші', transcription: 'Kartadan korsetinizshi', russian: 'Покажите на карте' },
  { id: 'address', topic: 'where', english: 'What is this address?', kazakh: 'Бұл қай мекенжай?', transcription: 'Bul qai mekenzhai?', russian: 'Какой это адрес?' },
  { id: 'how-get', topic: 'directions', english: 'How do I get there?', kazakh: 'Ол жерге қалай барамын?', transcription: 'Ol zherge qalai baramyn?', russian: 'Как туда добраться?' },
  { id: 'left', topic: 'directions', english: 'Left', kazakh: 'Солға', transcription: 'Solgha', russian: 'Налево' },
  { id: 'right', topic: 'directions', english: 'Right', kazakh: 'Оңға', transcription: 'Ongha', russian: 'Направо' },
  { id: 'straight', topic: 'directions', english: 'Straight ahead', kazakh: 'Тура', transcription: 'Tura', russian: 'Прямо' },
  { id: 'far', topic: 'directions', english: 'Is it far?', kazakh: 'Алыс па?', transcription: 'Alys pa?', russian: 'Это далеко?' },
  { id: 'menu', topic: 'food', english: 'The menu, please', kazakh: 'Мәзірді беріңізші', transcription: 'Mazirdi berinizshi', russian: 'Меню, пожалуйста' },
  { id: 'bill', topic: 'food', english: 'The bill, please', kazakh: 'Есепшотты беріңізші', transcription: 'Esepshotty berinizshi', russian: 'Счёт, пожалуйста' },
  { id: 'water', topic: 'food', english: 'Water, please', kazakh: 'Су беріңізші', transcription: 'Su berinizshi', russian: 'Воды, пожалуйста' },
  { id: 'no-meat', topic: 'food', english: 'I don’t eat meat', kazakh: 'Мен ет жемеймін', transcription: 'Men et zhemeimin', russian: 'Я не ем мясо' },
  { id: 'room', topic: 'hotel', english: 'Do you have a room?', kazakh: 'Бос бөлме бар ма?', transcription: 'Bos bolme bar ma?', russian: 'Есть свободный номер?' },
  { id: 'booking', topic: 'hotel', english: 'I have a booking', kazakh: 'Менде брондау бар', transcription: 'Mende brondau bar', russian: 'У меня есть бронь' },
  { id: 'wifi', topic: 'hotel', english: 'What is the Wi-Fi password?', kazakh: 'Wi-Fi құпиясөзі қандай?', transcription: 'Wi-Fi qupiyasozi qandai?', russian: 'Какой пароль от Wi-Fi?' },
  { id: 'taxi', topic: 'transport', english: 'Please call a taxi', kazakh: 'Такси шақырыңызшы', transcription: 'Taksi shaqyrynyzshy', russian: 'Вызовите такси, пожалуйста' },
  { id: 'ticket', topic: 'transport', english: 'Where do I buy a ticket?', kazakh: 'Билетті қайдан аламын?', transcription: 'Biletti qaidan alamyn?', russian: 'Где купить билет?' },
  { id: 'doctor', topic: 'emergency', english: 'I need a doctor', kazakh: 'Маған дәрігер керек', transcription: 'Maghan dariger kerek', russian: 'Мне нужен врач' },
  { id: 'police', topic: 'emergency', english: 'Call the police', kazakh: 'Полиция шақырыңыз', transcription: 'Politsiya shaqyrynyz', russian: 'Вызовите полицию' },
]

export const findPhrase = (id: string) => PHRASES.find((p) => p.id === id)

const LEARNED_KEY = 'tripdrip.phrasebook.learned'
const FAVOURITES_KEY = 'tripdrip.phrasebook.favourites'

const read = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const phraseStore = {
  learned: () => read(LEARNED_KEY),
  favourites: () => read(FAVOURITES_KEY),
  setLearned: (ids: string[]) => localStorage.setItem(LEARNED_KEY, JSON.stringify(ids)),
  setFavourites: (ids: string[]) => localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids)),
}

export type SpeakLang = 'kk' | 'ru'

// Kazakh letters a Russian voice cannot read, mapped to the closest sounds.
const KK_TO_RU: Record<string, string> = {
  ә: 'э', Ә: 'Э', ғ: 'г', Ғ: 'Г', қ: 'к', Қ: 'К', ң: 'н', Ң: 'Н',
  ө: 'ё', Ө: 'Ё', ұ: 'у', Ұ: 'У', ү: 'ю', Ү: 'Ю', һ: 'х', Һ: 'Х', і: 'и', І: 'И',
}

let voices: SpeechSynthesisVoice[] = []
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => {
    voices = speechSynthesis.getVoices()
  }
  load()
  speechSynthesis.addEventListener('voiceschanged', load)
}

const voiceFor = (prefix: string) => voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))

/** True when the device has a real Kazakh voice (otherwise Kazakh is read by a Russian voice). */
export const hasKazakhVoice = () => !!voiceFor('kk')

/**
 * Reads the phrase aloud with the device voice, offline when the voice is installed.
 * Kazakh uses a Kazakh voice if the device has one, otherwise a Russian voice with the
 * Kazakh-only letters replaced, which sounds close enough for a local to understand.
 */
export function speak(phrase: Phrase, lang: SpeakLang = 'kk') {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance()
  if (lang === 'kk') {
    const kk = voiceFor('kk')
    if (kk) {
      utterance.text = phrase.kazakh
      utterance.voice = kk
      utterance.lang = kk.lang
    } else {
      utterance.text = phrase.kazakh.replace(/[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/g, (ch) => KK_TO_RU[ch] ?? ch)
      const ru = voiceFor('ru')
      if (ru) utterance.voice = ru
      utterance.lang = ru?.lang ?? 'ru-RU'
      utterance.rate = 0.85
    }
  } else {
    const ru = voiceFor('ru')
    utterance.text = phrase.russian
    if (ru) utterance.voice = ru
    utterance.lang = ru?.lang ?? 'ru-RU'
  }
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}
