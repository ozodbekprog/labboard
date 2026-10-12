# LabBoard

Universitetlar uchun interaktiv "laboratoriya" platformasi: **cheksiz doska + fan simulyatsiyalari + jonli video darslar** bitta joyda.

O'qituvchi dars xonasida doskada tushuntiradi, o'quvchilar real-time ko'radi; simulyatsiyalar orqali fizika, matematika, kimyo, tarix va kodni jonli sinab ko'rish mumkin.

## Nimalar bor

- Cheksiz interaktiv doska (tldraw 5.5.2) — real-time, bir nechta foydalanuvchi bilan (@tldraw/sync + o'z WebSocket server)
- 5 ta fan simulyatsiyasi (quyida)
- Simulyatsiyani doskaga "pin" qo'yish (html2canvas-pro) — simulyatsiya holatini rasm sifatida doskaga joylashtirish
- Jonli video darslar (LiveKit)
- Chat (3 soniyada yangilanish) va AI panel (streaming, OpenAI-mos endpoint)
- Auth (kirish / ro'yxatdan o'tish), guruplar, dars jadvali dashboard
- SQLite bazasi (Drizzle ORM + better-sqlite3)
- Zod validation, lucide-react ikonkalari
- Demo ma'lumotlar: guruhlar, xonalar, darslar va chat tarixi tayyor

### Simulyatsiya modullari (`src/lib/labs/modules/`)

- `math-grapher` — matematik grafiklar chizish
- `physics-projectile` — fizika: projectil harakati
- `chem-periodic` — kimyo: davriy jadval
- `history-timeline` — tarix: vaqt chizig'i
- `code-runner` — kod ishga tushirish

## Texnologiyalar

Next.js 16.4 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · tldraw 5.5.2 · @tldraw/sync + @tldraw/sync-core + ws · Drizzle ORM · better-sqlite3 · LiveKit · html2canvas-pro · zod

## Tez boshlash

```bash
pnpm install
pnpm db:push      # jadvallar yaratiladi → data/labboard.db
pnpm seed         # demo akkauntlar, guruhlar, darslar, chat xabarlari
pnpm dev          # ikki xizmat: Next (:3001 yoki bo'sh port) + sync server (:5858)
```

Brauzerda Next manzilini oching (qaysi port tanlandi — terminal chiqishiga qarang).

Alohida xizmatlar kerak bo'lsa: `pnpm dev:next` (faqat Next) va `pnpm dev:sync` (faqat sync server).

Birinchi marta: `pnpm install` → `pnpm db:push` → `pnpm seed` → `pnpm dev` tartibida ishlatish tavsiya etiladi.

## Konfiguratsiya

`.env.local` faylini yarating (namuna: `.env.example`).

| O'zgaruvchi | Tavsif | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SYNC_URL` | sync server manzili | `ws://localhost:5858` |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit video kalitlari (cloud.livekit.io dan olinadi) | bo'sh — video panel faqat hint ko'rsatadi |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | AI endpoint (OpenAI, ZenMux, OpenRouter h.k.) | bo'sh — AI panel faqat hint ko'rsatadi |

## Ma'lumotlar bazalari

- `data/labboard.db` — asosiy baza (Drizzle ORM, auth / guruhlar / darslar / chat)
- `data/sync.db` — sync server bazasi (tldraw real-time holatlari)

## Loyiha tuzilishi

```
labboard/
├── src/
│   ├── app/
│   │   ├── (auth)/            # kirish / ro'yxatdan o'tish
│   │   ├── (platform)/        # dashboard, groups, schedule
│   │   └── room/[id]/         # dars xonasi
│   ├── components/room/       # RoomClient (tldraw+sync), LabPanel, ChatPanel, VideoPanel, AIPanel
│   ├── lib/labs/              # simulyatsiya modullari reyestri
│   │   └── modules/           # math-grapher, physics-projectile, chem-periodic,
│   │                          # history-timeline, code-runner
│   ├── db/                    # Drizzle sxemasi
│   ├── server/                # auth + server actions
│   └── proxy.ts               # Next 16 proxy (middleware)
├── server/sync.ts             # real-time sync WebSocket server (port 5858, SQLite: data/sync.db)
├── scripts/seed.ts            # demo ma'lumotlar
├── drizzle.config.ts
├── .env.example
└── package.json
```

## Demo akkauntlar

| Login | Parol | Rol |
| --- | --- | --- |
| `teacher@lab.uz` | `labboard123` | o'qituvchi |
| `student@lab.uz` | `labboard123` | o'quvchi |
| `malika@lab.uz` | `labboard123` | o'quvchi |

Teacher akkaunti bilan kirsa tayyor mazmun ko'rinadi: **2 ta xona** (Fizika lab, Matematika grafik), **MAT-101** guruhi, darslar va chat xabarlari.

## Dars xonasi

- **Doska** — tldraw, real-time hamkorlik, bir nechta foydalanuvchi bir vaqtda tahrirlaydi
- **O'ng panel, 4 ta tab:**
  - **Lab** — 5 ta simulyatsiya, "📌 Doskaga qo'yish" tugmasi bilan doskaga pin qo'yish
  - **Chat** — 3 soniyada yangilanadigan xabarlar
  - **Video** — LiveKit orqali jonli dars
  - **AI** — streaming javoblar

## Yo'l xaritasi

- tldraw ichida jonli interaktiv widgetlar (pin rasmidan tashqari)
- Python (Pyodide) va SQL runnerlar
- fizika: elektr zanjirlari, tovushqonlar
- kimyo: reaksiya balanseri
- biologiya: 3D hujayra
- dars transkripti + AI xulosa
- sync serverga token-autentifikatsiya
- Postgres'ga o'tish
- prod deploy: Vercel + sync server (VPS/Fly.io) + LiveKit Cloud
- mobil ko'rinish

## Muammolar / cheklovlar

- sync server alohida jarayon sifatida ishlaydi — prod'da alohida hosting kerak
- video va AI kalitlarsiz ishlamaydi (mos panelar faqat kalit so'raydigan hint ko'rsatadi)
- tldraw bepul rejimi watermark bilan ishlaydi; prod uchun litsenziya olish mumkin
