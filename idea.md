# TripDrip — Продуктовая и архитектурная спецификация (Master Spec)

## 1. Главная идея и ценностное предложение

**TripDrip** — веб-приложение (PWA) для путешествий по Казахстану, объединяющее автономного офлайн ИИ-помощника, платформу взаимопомощи и нетворкинга с верифицированными местными жителями (**Қонақ**), а также систему генерации уникальных геймифицированных маршрутов с реальными скидками у локального бизнеса.

| Ценность                 | Как реализуется в TripDrip                                                                                                                                 |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Проще**                | Локальный офлайн ИИ-ассистент в браузере (работает в авиарежиме на Кольсае, Чарыне и в горах) + помощь местных через Қонақ                                 |
| **Дешевле**              | Начисление монет лояльности за маршруты, визиты и помощь с обменом на одноразовые QR-промокоды 10–20% у партнёров                                          |
| **Интереснее**           | Карта верифицированных туристов и местных для нетворкинга по хобби/языкам + уникальные маршруты под интересы пользователя, разводящие туристический трафик |
| **Выгоднее принимающим** | Сетевые и локальные партнёры получают измеримый поток гостей через QR-промокоды и буст точек; местные — языковую практику, знакомства и монеты             |

### Роли на платформе

| Роль (`user_role_enum`) | Описание                                                                               | Возможности и доступ                                                                                                                                         |
| :---------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tourist`               | Иностранный гость (определяется автоматически при регистрации: `country_code != 'KZ'`) | Офлайн ИИ-ассистент, запросы Қонақ, генерация уникальных маршрутов, чекины, карта, чаты, кошелёк, QR-промокоды                                               |
| `local`                 | Гражданин или резидент РК (`country_code == 'KZ'`)                                     | Лента запросов Қонақ рядом (принять/отклонить), статусы «Готов к нетворкингу» / «Могу принять в гости», карта, чаты, рейтинг, кошелёк (промокоды на 30 дней) |
| `partner`               | Бренд или сеть с 1..N филиалами (например, Okadzaki)                                   | Кабинет партнёра: управление филиалами и офферами, гашение QR-кодов на кассе, подтверждение визитов, аналитика по странам гостей                             |
| `admin`                 | Команда модерации TripDrip                                                             | Админ-панель: очереди верификаций (с автоудалением фото), жалобы и блокировки, апрув новых партнёров                                                         |

---

## 2. Технологический стек и архитектура репозитория

Проект рассчитан на параллельную разработку двумя инженерами (**Backend/DB** и **Frontend/PWA**) с использованием строгого контракта API и мок-слоя на клиенте.

- **Backend:** Go 1.22+, PostgreSQL 16+, `pgx/v5` (`pgxpool`), **`sqlc`** (типобезопасная кодогенерация из чистого SQL, без ORM), **`goose`** (SQL-миграции), `net/http` (stdlib 1.22+) или `chi`, JWT (Access + Refresh), Docker Compose.
- **Frontend:** Web PWA — React + TypeScript + Vite, Tailwind CSS, TanStack Query, MapLibre GL JS (или Leaflet с кластеризацией), `vite-plugin-pwa` (Service Worker + IndexedDB).
- **Offline AI Engine (100% Client-Side):** локальный модуль внутри PWA (Service Worker + IndexedDB / Cache Storage). Включает структурированную локальную базу знаний по РК + клиентский движок семантического поиска / легковесную браузерную модель (WebAssembly/WebGPU с мгновенным фолбэком на гибридный локальный интент-поиск) для гарантированной работы без сети.

```text
tripdrip/
├── backend/
│   ├── cmd/api/main.go                 # Точка входа, конфигурация, DI, graceful shutdown
│   ├── internal/
│   │   ├── config/                     # Чтение env-переменных
│   │   ├── db/
│   │   │   ├── migrations/             # SQL-миграции goose (001_init.sql)
│   │   │   ├── queries/                # SQL-запросы для sqlc (users, qonaq, routes, wallet, admin...)
│   │   │   └── sqlc/                   # Автогенерированный Go-код (read-only)
│   │   ├── domain/                     # Доменные ошибки, Haversine, антифрод, валидаторы, спам-фильтр
│   │   ├── service/                    # Бизнес-логика и явные pgx.Tx транзакции
│   │   ├── transport/http/             # HTTP-хендлеры, JWT/RBAC middleware, DTO, CORS
│   │   └── seed/                       # Сидер демо-данных (10–15 профилей, 3–5 партнёров, точки)
│   ├── sqlc.yaml
│   └── Dockerfile
├── frontend/
│   ├── public/                         # PWA manifest, иконки, локальные данные офлайн-ИИ
│   ├── src/
│   │   ├── api/                        # Типизированный API-клиент + переключаемый mock-слой (MSW)
│   │   ├── types/                      # TypeScript-интерфейсы, синхронизированные со схемой БД
│   │   ├── offline-ai/                 # Офлайн ИИ-помощник: база знаний РК, экстренные кейсы, переводчик
│   │   ├── features/                   # Модули: auth, verification, qonaq, map, routes, wallet, partner, admin
│   │   └── sw.ts                       # Service Worker (полное кэширование shell и базы офлайн-ИИ)
├── docs/
│   └── openapi.yaml                    # Единый OpenAPI-контракт
└── docker-compose.yml                  # PostgreSQL + Backend + Frontend
```

---

## 3. Функциональные модули и бизнес-правила

### 3.1. Регистрация, верификация и профиль

- Регистрация: имя, фамилия, код страны (`ISO 3166-1 alpha-2`), email или телефон, пароль, обязательные согласия (обработка ПД, правила сообщества).
- Профиль: фото, цель визита (`leisure | work | study | family`), даты поездки (`trip_start_date`, `trip_end_date`), предпочтения (`nature | megapolis | both`), хобби (`TEXT[]`), языки с уровнем (`JSONB`: `[{"code":"en","level":"B2"}]`), город/район, ожидания от знакомства, флаги для местных (`ready_for_networking`, `can_host_guests`).
- **Верификация (MVP-имитация):** турист загружает номер паспорта + фото разворота + селфи; местный — ИИН (12 цифр, проверка контрольной суммы) + фото удостоверения. В БД хранится только криптографический хэш номера (`doc_number_hash`). После решения админа (`approved` / `rejected`) поля `doc_photo_url` и `selfie_url` принудительно очищаются (`NULL`).
- **Ограничение до верификации:** неверифицированный пользователь (`is_verified = false`) может пользоваться только офлайн ИИ-помощником; доступ к Қонақ и карте закрыт.

### 3.2. Офлайн ИИ-помощник (замена статичного чит-шита)

- Работает полностью локально в браузере без подключения к интернету и без таблиц в PostgreSQL.
- Основные сценарии:
  - **Экстренная помощь:** закреплённая кнопка вызова **112**, алгоритмы действий при потере паспорта, травме, ориентировании в горах/нацпарках, обращении в полицию (102) и скорую (103).
  - **Базовая справка по стране:** работа иностранных банковских карт, банкоматы, обмен валют, связь, транспорт/такси, бытовые правила.
  - **Минимальный офлайн-переводчик (EN ↔ RU ↔ KZ):** перевод базовых и ситуативных фраз на русский и казахский с упрощённой транскрипцией и полноэкранным режимом «Показать местному» (крупный контрастный текст).

### 3.3. Қонақ, карта людей и единая система чатов

- **Три входа в единую таблицу `chats`:**
  1. **Общий Қонақ:** турист создаёт запрос (тип помощи, описание до 300 символов, город/район, дата/время, кол-во человек; лимит — не более 3 активных запросов одновременно) → местные видят карточку в ленте и жмут «Принять» или «Отказ» (отказ не закрывает запрос для остальных) → турист выбирает одного хоста → создаётся чат (`context_type = 'qonaq'`).
  2. **Личный Қонақ с карты:** кнопка «Попросить помочь» в карточке местного создаёт `help_request` с заполненным `target_local_id`; при согласии местного создаётся чат.
  3. **Нетворкинг с карты:** кнопка «Написать» создаёт `network_request`; чат (`context_type = 'networking'`) открывается строго после взаимного согласия получателя.
- **Завершение Қонақ:** оба участника подтверждают выполнение встречи и оставляют отзыв (1–5 звёзд). После взаимного подтверждения местному начисляется **+30 монет** (лимит: до 3 раз в день) и пересчитывается `rating_avg` / `qonaq_completed_count`.
- **Приватность на карте:**
  - Отображение выключено по умолчанию (`is_visible = false`), включается/выключается в 1 клик.
  - В `map_presence` хранятся **исключительно координаты центроида города или района** — точный GPS пользователя никогда не сохраняется и не отдаётся. Пользователи на карте группируются в кластеры.
  - Слои карты: туристы (активные по датам поездки), местные (нетворкинг), местные (могут принять), филиалы партнёров.
  - Фильтры: город, хобби, язык, страна, природа/мегаполис.
  - Карточка туриста скрывается автоматически после истечения `trip_end_date`.

### 3.4. Уникальные маршруты, антифрод и экономика монет

- **Динамическая генерация маршрутов (`user_routes` + `user_route_stops`):** под каждый запрос пользователя (точка А → точка В, город, `vibe_preference`) бэкенд подбирает персональный набор из 3–5 точек (`map_points`: достопримечательности + филиалы партнёров), учитывая буст (`is_boosted`) и распределение нагрузки, чтобы избегать скопления трафика в одних и тех же точках.
- **Правила начисления монет (баллы лояльности, без покупки за деньги и вывода):**
  - Достопримечательность на маршруте: **+10 монет** (1 раз навсегда на точку).
  - Визит к партнёру (подтверждённый на кассе): **+20 монет** (1 раз в день на весь бренд партнёра).
  - Маршрут пройден целиком: **+30 монет** (1 раз на маршрут).
  - Помощь по Қонақ (взаимное подтверждение): **+30 монет** местному (до 3 раз в день).
- **Антифрод чекинов (`point_checkins`):**
  - Проверка геодистанции по формуле Haversine (`<= radius_meters`, по умолчанию 100 м).
  - Проверка скорости относительно последнего чекина пользователя (отсечение аномалий > 180 км/ч).
  - Защита от дублей на уровне частичных уникальных индексов PostgreSQL.
- **Мультифилиальные партнёры (1:N) и промокоды:**
  - Один бренд (`partners`, например Okadzaki) имеет множество филиалов (`partner_locations`) и общие/брендовые `offers`.
  - Обмен монет на одноразовый QR-промокод (например, 50 монет = 10%, 100 монет = 20%).
  - **Срок действия промокода:** для `tourist` — до конца `trip_end_date`; для `local` (или при отсутствии даты) — **фиксированно 30 дней** от момента выдачи.
  - Гашение QR-кода происходит в кабинете партнёра с привязкой к конкретному филиалу (`redeemed_location_id`).

### 3.5. Безопасность и модерация

- Антиспам в чатах: автоматическое сканирование сообщений на цены/коммерческие ссылки (флаг `flagged_commercial`).
- Жалобы и автоскрытие: уникальный индекс `(reporter_id, target_user_id)` в `reports` гарантирует подсчёт жалоб от разных пользователей. При накоплении **3 открытых жалоб** система автоматически выставляет `map_presence.hidden_by_moderation = true` до проверки админом.
- Блокировка в 1 клик (`blocks`) скрывает пользователей друг от друга.
- Удаление аккаунта каскадно удаляет документы, профиль и присутствие на карте.

---

## 4. Схема базы данных PostgreSQL (`backend/internal/db/migrations/001_init.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role_enum AS ENUM ('tourist', 'local', 'partner', 'admin');
CREATE TYPE verification_doc_enum AS ENUM ('passport', 'iin');
CREATE TYPE verification_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE trip_purpose_enum AS ENUM ('leisure', 'work', 'study', 'family');
CREATE TYPE vibe_pref_enum AS ENUM ('nature', 'megapolis', 'both');

CREATE TYPE help_type_enum AS ENUM ('directions', 'translation_call', 'city_tour', 'dastarkhan', 'host_stay');
CREATE TYPE help_status_enum AS ENUM ('open', 'has_responses', 'matched', 'completed', 'cancelled', 'expired');
CREATE TYPE request_decision_enum AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE chat_context_enum AS ENUM ('qonaq', 'networking');

CREATE TYPE point_type_enum AS ENUM ('landmark', 'partner');
CREATE TYPE route_status_enum AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE coin_reason_enum AS ENUM ('landmark_checkin', 'partner_visit', 'route_completed', 'qonaq_help', 'promo_exchange');
CREATE TYPE promo_status_enum AS ENUM ('active', 'redeemed', 'expired');
CREATE TYPE report_status_enum AS ENUM ('open', 'resolved', 'dismissed');

-- ==========================================
-- 2. USERS, PROFILES, VERIFICATION, MAP PRESENCE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role_enum NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    country_code CHAR(2) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(32) UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    pd_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rules_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_contact_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trip_purpose trip_purpose_enum,
    trip_start_date DATE,
    trip_end_date DATE,
    vibe_preference vibe_pref_enum NOT NULL DEFAULT 'both',
    hobbies TEXT[] NOT NULL DEFAULT '{}',
    languages JSONB NOT NULL DEFAULT '[]',
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    expectations VARCHAR(240),
    ready_for_networking BOOLEAN NOT NULL DEFAULT FALSE,
    can_host_guests BOOLEAN NOT NULL DEFAULT FALSE,
    qonaq_completed_count INT NOT NULL DEFAULT 0 CHECK (qonaq_completed_count >= 0),
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_dates CHECK (trip_end_date IS NULL OR trip_start_date IS NULL OR trip_end_date >= trip_start_date)
);

CREATE INDEX idx_profiles_hobbies_gin ON profiles USING GIN (hobbies);
CREATE INDEX idx_profiles_languages_gin ON profiles USING GIN (languages jsonb_path_ops);
CREATE INDEX idx_profiles_city ON profiles (city);

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type verification_doc_enum NOT NULL,
    doc_number_hash TEXT NOT NULL,
    doc_photo_url TEXT,
    selfie_url TEXT,
    status verification_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_verifications_status ON verifications (status, created_at);

CREATE TABLE map_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    approx_lat DOUBLE PRECISION NOT NULL,
    approx_lng DOUBLE PRECISION NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_by_moderation BOOLEAN NOT NULL DEFAULT FALSE,
    visible_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_map_presence_active ON map_presence (city)
    WHERE is_visible = TRUE AND hidden_by_moderation = FALSE;

-- ==========================================
-- 3. PARTNERS (1:N LOCATIONS) & OFFERS
-- ==========================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    brand_name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    bin CHAR(12) NOT NULL UNIQUE,
    logo_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_locations_partner ON partner_locations (partner_id);
CREATE INDEX idx_partner_locations_city ON partner_locations (city) WHERE is_active = TRUE;

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_percent SMALLINT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    coin_cost INT NOT NULL CHECK (coin_cost > 0),
    total_limit INT NOT NULL CHECK (total_limit > 0),
    remaining_limit INT NOT NULL CHECK (remaining_limit >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_offer_limits CHECK (remaining_limit <= total_limit)
);

-- ==========================================
-- 4. MAP POINTS, UNIQUE ROUTES & ANTI-FRAUD CHECK-INS
-- ==========================================
CREATE TABLE map_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_type point_type_enum NOT NULL,
    partner_location_id UUID UNIQUE REFERENCES partner_locations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    vibe vibe_pref_enum NOT NULL DEFAULT 'both',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100 CHECK (radius_meters > 0),
    reward_coins INT NOT NULL DEFAULT 10 CHECK (reward_coins >= 0),
    is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_point_partner_link CHECK (
        (point_type = 'partner' AND partner_location_id IS NOT NULL) OR
        (point_type = 'landmark' AND partner_location_id IS NULL)
    )
);

CREATE INDEX idx_map_points_city_active ON map_points (city, point_type) WHERE is_active = TRUE;

CREATE TABLE user_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    vibe_preference vibe_pref_enum NOT NULL,
    status route_status_enum NOT NULL DEFAULT 'active',
    completion_reward_coins INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE user_route_stops (
    route_id UUID NOT NULL REFERENCES user_routes(id) ON DELETE CASCADE,
    point_id UUID NOT NULL REFERENCES map_points(id) ON DELETE RESTRICT,
    stop_order SMALLINT NOT NULL CHECK (stop_order > 0),
    is_visited BOOLEAN NOT NULL DEFAULT FALSE,
    visited_at TIMESTAMPTZ,
    PRIMARY KEY (route_id, stop_order),
    UNIQUE (route_id, point_id)
);

CREATE TABLE point_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    point_id UUID NOT NULL REFERENCES map_points(id) ON DELETE RESTRICT,
    point_type point_type_enum NOT NULL,
    partner_id UUID REFERENCES partners(id),
    route_id UUID REFERENCES user_routes(id),
    user_lat DOUBLE PRECISION NOT NULL,
    user_lng DOUBLE PRECISION NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_checkin_landmark_once
    ON point_checkins (user_id, point_id)
    WHERE point_type = 'landmark';

CREATE UNIQUE INDEX uq_checkin_partner_daily
    ON point_checkins (user_id, partner_id, checkin_date)
    WHERE point_type = 'partner';

CREATE INDEX idx_checkins_user_latest ON point_checkins (user_id, checked_in_at DESC);

-- ==========================================
-- 5. QONAQ, NETWORKING & UNIFIED CHATS
-- ==========================================
CREATE TABLE help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_local_id UUID REFERENCES users(id) ON DELETE SET NULL,
    selected_local_id UUID REFERENCES users(id) ON DELETE SET NULL,
    help_type help_type_enum NOT NULL,
    description VARCHAR(300) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    needed_at TIMESTAMPTZ NOT NULL,
    people_count SMALLINT NOT NULL DEFAULT 1 CHECK (people_count BETWEEN 1 AND 20),
    status help_status_enum NOT NULL DEFAULT 'open',
    tourist_confirmed_done BOOLEAN NOT NULL DEFAULT FALSE,
    local_confirmed_done BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_help_requests_feed ON help_requests (city, status, expires_at)
    WHERE status IN ('open', 'has_responses');

CREATE TABLE help_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision request_decision_enum NOT NULL,
    message VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, local_id)
);

CREATE TABLE network_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intro_message VARCHAR(240),
    status request_decision_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT chk_network_not_self CHECK (sender_id <> receiver_id),
    UNIQUE (sender_id, receiver_id)
);

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type chat_context_enum NOT NULL,
    help_request_id UUID UNIQUE REFERENCES help_requests(id) ON DELETE CASCADE,
    network_request_id UUID UNIQUE REFERENCES network_requests(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_chat_users_diff CHECK (user1_id <> user2_id),
    CONSTRAINT chk_chat_context_fk CHECK (
        (context_type = 'qonaq' AND help_request_id IS NOT NULL AND network_request_id IS NULL) OR
        (context_type = 'networking' AND network_request_id IS NOT NULL AND help_request_id IS NULL)
    )
);

CREATE INDEX idx_chats_user1 ON chats (user1_id);
CREATE INDEX idx_chats_user2 ON chats (user2_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    flagged_commercial BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_time ON messages (chat_id, created_at ASC);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_not_self CHECK (reviewer_id <> reviewee_id),
    UNIQUE (help_request_id, reviewer_id)
);

-- ==========================================
-- 6. ATOMIC WALLETS, LEDGER & PROMO CODES
-- ==========================================
CREATE TABLE wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL CHECK (amount <> 0),
    reason coin_reason_enum NOT NULL,
    reference_id UUID,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coin_tx_user ON coin_transactions (user_id, created_at DESC);

CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status promo_status_enum NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_location_id UUID REFERENCES partner_locations(id),
    redeemed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_user ON promo_codes (user_id, status);

-- ==========================================
-- 7. SAFETY & MODERATION
-- ==========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    status report_status_enum NOT NULL DEFAULT 'open',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_report_not_self CHECK (reporter_id <> target_user_id),
    UNIQUE (reporter_id, target_user_id)
);

CREATE INDEX idx_reports_open ON reports (status, created_at) WHERE status = 'open';

CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_block_not_self CHECK (blocker_id <> blocked_id)
);
```

---

## 5. Критичные транзакционные потоки (Backend Go)

- **Обмен монет на промокод (`pgx.Tx`):** блокировка `wallets` (`FOR UPDATE`) и `offers` (`FOR UPDATE`) → проверка `balance >= coin_cost` и `remaining_limit > 0` → расчёт `expires_at` (`trip_end_date` для туриста / `NOW() + 30 days` для местного) → списание баланса, декремент `remaining_limit`, запись в `coin_transactions` с `idempotency_key`, создание `promo_codes`.
- **Гашение QR-кода на кассе:** один атомарный `UPDATE promo_codes SET status = 'redeemed', redeemed_at = NOW(), redeemed_location_id = $2, redeemed_by_user_id = $3 WHERE code = $1 AND status = 'active' AND expires_at > NOW() RETURNING *`. При 0 строк — отказ (код погашен/просрочен/невалиден).
- **Чекин на точке маршрута (`pgx.Tx`):** проверка Haversine ≤ `radius_meters` → проверка скорости от последнего чекина (`distance_km / delta_hours <= 180`) → `INSERT INTO point_checkins` (уникальные индексы отбивают повторы) → обновление `user_route_stops.is_visited = TRUE` → начисление монет за точку (+ проверка закрытия всех остановок маршрута для бонуса +30 монет).
- **Верификация и жалобы (`pgx.Tx`):** при решении админа по `verifications` обнулять `doc_photo_url = NULL, selfie_url = NULL` и синхронно обновлять `users.is_verified`; при вставке в `reports` проверять количество открытых жалоб на `target_user_id` и при `>= 3` выставлять `map_presence.hidden_by_moderation = TRUE`.

---

## 6. Единый контракт REST API (`/api/v1`)

- Авторизация: `Authorization: Bearer <access_token>`
- Единый формат ошибки:
  ```json
  {
    "error": {
      "code": "INSUFFICIENT_COINS",
      "message": "Not enough coins for this offer"
    }
  }
  ```

| Домен                  | Эндпоинты                                                                                                                                                                                                                                                                | Назначение                                                                                                                              |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth & Profile**     | `POST /auth/register`, `POST /auth/login`, `GET /me`, `PATCH /me/profile`, `DELETE /me`                                                                                                                                                                                  | Регистрация с автовыбором роли, вход, профиль (теги, языки, даты поездки), удаление аккаунта                                            |
| **Verification**       | `POST /verifications`, `GET /verifications/me`                                                                                                                                                                                                                           | Отправка данных документа (mock KYC) и проверка статуса                                                                                 |
| **Map & Networking**   | `GET /map/entities`, `PATCH /me/map-presence`, `POST /network-requests`, `POST /network-requests/{id}/respond`                                                                                                                                                           | Выдача сущностей карты с фильтрами (`layer`, `city`, `hobby`, `language`, `vibe`, `country`), управление видимостью, запросы «Написать» |
| **Қонақ & Chats**      | `POST /qonaq/requests`, `GET /qonaq/feed`, `POST /qonaq/requests/{id}/respond`, `POST /qonaq/requests/{id}/select-host`, `POST /qonaq/requests/{id}/confirm`, `POST /qonaq/requests/{id}/reviews`, `GET /chats`, `GET /chats/{id}/messages`, `POST /chats/{id}/messages` | Полный жизненный цикл Қонақ (общий и личный), взаимное подтверждение (+30 монет), единый чат со спам-сканером и отзывами                |
| **Routes & Check-ins** | `POST /routes/generate`, `GET /routes/active`, `POST /routes/{id}/stops/{pointId}/checkin`                                                                                                                                                                               | Генерация уникального маршрута А → В, просмотр активного маршрута, антифрод-чекин на точке                                              |
| **Wallet & Promos**    | `GET /wallet`, `GET /offers`, `POST /offers/{id}/exchange`, `GET /promocodes/me`                                                                                                                                                                                         | Баланс и леджер монет, каталог офферов, обмен на QR-код, список кодов пользователя                                                      |
| **Partner**            | `GET /partner/profile`, `POST /partner/locations`, `POST /partner/offers`, `POST /partner/promocodes/redeem`, `POST /partner/visits/confirm`, `GET /partner/stats`                                                                                                       | Управление филиалами и офферами, гашение QR на кассе, подтверждение визита (+20 монет), аналитика по странам                            |
| **Admin & Safety**     | `POST /reports`, `POST /blocks`, `GET /admin/verifications`, `POST /admin/verifications/{id}/review`, `GET /admin/reports`, `POST /admin/reports/{id}/resolve`, `POST /admin/partners/{id}/approve`                                                                      | Жалобы (автоскрытие на 3-й), блокировки, очереди модерации верификаций, жалоб и партнёров                                               |

---

## 7. Карта экранов UI/UX (PWA + B2B/Admin)

- **Онбординг:** Регистрация / Вход, Верификация (загрузка + статус), Анкета профиля.
- **Турист / Местный:**
  - **Главная:** быстрые кнопки «Офлайн ИИ-помощник» и «Қонақ», плашка экстренного вызова **112**, нижняя навигация (`Главная`, `Карта`, `Маршрут`, `Кошелёк`, `Профиль`).
  - **Офлайн ИИ-помощник:** чат с локальным агентом, быстрые карточки (экстренные службы, банки, транспорт), офлайн-переводчик RU/KZ/EN с полноэкранным режимом «Показать местному».
  - **Қонақ:** форма нового запроса (турист), лента запросов рядом с «Принять/Отказ» (местный), единый чат (кнопка «Выполнено», отзыв, жалоба, блок).
  - **Карта Казахстана:** слои, фильтры, кластеризация по городам/районам, карточка человека («Написать» / «Попросить помочь») и карточка филиала партнёра.
  - **Маршрут:** выбор А → В и стиля, уникальные точки с монетами, кнопка «Собрать» (GPS-чекин).
  - **Кошелёк:** баланс, история транзакций, каталог офферов, активные QR-промокоды.
- **Веб-кабинеты:** Кабинет партнёра (филиалы, офферы, ввод/скан QR для гашения, статистика) и Админ-панель (3 очереди модерации).

---

## 8. Строгие границы MVP (Out of Scope)

Не реализовывать в рамках текущей версии:

- Интеграции с внешними KYC-провайдерами и eGov (используется ручной апрув в админке).
- Платёжные шлюзы, биллинг партнёров, покупку или вывод монет в фиат.
- Ночлег у хостов («принять в гости» заблокировано правилом до накопления рейтинга).
- Серверный автоперевод сообщений в чатах.
- Собственный сервер офлайн-тайлов карты всего Казахстана.

---

## 9. Требования к сид-данным и критерии приёмки (DoD)

- **Сид-данные (`backend/internal/seed`):** 10–15 профилей туристов и местных в разных городах/районах РК с хобби и языками; 3–5 партнёров (включая минимум 1 сетевой бренд вроде Okadzaki с 2–3 филиалами); 10+ точек `map_points` (достопримечательности + филиалы); активные офферы на 10% и 20%.
- **Сквозной критерий приёмки (Demo Flow):**
  1. Регистрация туриста + ручной апрув в админке (убедиться, что ссылки на фото документов обнулились в БД).
  2. Переключение устройства/браузера в **авиарежим / Offline** → полноценная работа офлайн ИИ-помощника и переводчика с показом на весь экран.
  3. Возврат онлайн → создание запроса Қонақ → отклик местного → выбор хоста → чат → взаимное подтверждение и начисление +30 монет местному.
  4. Генерация уникального маршрута А → В → прохождение чекина с проверкой радиуса/антифрода → обмен монет на QR-промокод → одноразовое гашение QR в кабинете партнёра с отображением статистики.

---

## 10. Системные директивы для AI / Antigravity

> **Project Directives — TripDrip:**
>
> 1. Strictly follow the PostgreSQL schema (`001_init.sql`) and REST API contract (`/api/v1`) in this document. Keep Go DTOs and Frontend `src/types/` 100% synchronized.
> 2. Backend must be written in idiomatic Go 1.22+ using `pgx/v5`, `sqlc`, and `goose`. Never use GORM, any reflection-based ORM, or string-concatenated SQL.
> 3. All coin balance updates, promo exchanges, promo redemptions, check-ins, verification reviews, and report auto-hide triggers must run inside explicit `pgx.Tx` transactions with `SELECT ... FOR UPDATE` and idempotency keys where applicable.
> 4. Enforce privacy & security invariants strictly: `map_presence` stores only city/district centroids (never exact user GPS); verification image URLs are cleared to `NULL` upon admin decision; chats require mutual consent; 3 unique open reports set `hidden_by_moderation = true`.
> 5. The Offline AI Assistant must operate 100% client-side inside the PWA (Service Worker + IndexedDB) with zero backend dependencies and pass full tests with Network set to `Offline`.
> 6. Frontend must maintain a toggleable mock API layer (`VITE_USE_MOCKS=true`) conforming to the exact REST API contract so UI development never blocks on backend progress.
