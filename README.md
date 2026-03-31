# 🛒 ShopOrganizer

> AI-powered shopping list manager for restaurant supply procurement. Converts messy WhatsApp orders from 15+ restaurants into structured, aggregated shopping lists — grouped by market, with real-time cloud sync.

**Live:** [https://belanja.nexai.art](https://belanja.nexai.art)

---

## Problem Statement

A procurement agent handles daily ingredient orders from **15 restaurants** simultaneously. Each restaurant sends orders via WhatsApp in their own format — some as text, some as images (handwritten notes, screenshots). The ingredient names vary wildly between restaurants:

| Restaurant A | Restaurant B | Actual Ingredient |
|---|---|---|
| "CABE RAWIT HIJAU" | "cengek ijo" | Cabai Rawit Hijau |
| "BAWANG MERAH BATU KUPAS" | "b merah kupas" | Bawang Merah Batu Kupas |
| "DADA FILLET BERSIH" | "ayam fillet dada" | Ayam Fillet Dada |

The agent must:
1. Parse and understand all variations
2. Map to standardized ingredient names
3. Aggregate quantities across restaurants
4. Group items by market/vendor for efficient shopping
5. Track prices and completion status in real-time

## Solution

ShopOrganizer uses **Google Gemini AI** to parse incoming orders (text + images), fuzzy-match against a known ingredient database, and produce a clean, market-grouped shopping list — all accessible from any device via a responsive web app.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                         │
│                    React 19 + Vite 7                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Login   │  │  Input   │  │ Shopping │  │  Settings  │  │
│  │  Page    │  │  View    │  │  List    │  │  (Admin)   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │              │             │              │         │
│       ▼              ▼             ▼              ▼         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Service Layer (JS Modules)              │   │
│  │                                                      │   │
│  │  firebaseConfig.js  │  storageService.js             │   │
│  │  geminiService.js   │  fuzzyMatch (Dice coeff.)      │   │
│  └──────────┬──────────┴──────────┬─────────────────────┘   │
└─────────────┼─────────────────────┼─────────────────────────┘
              │                     │
              ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │   Google Gemini  │  │  Firebase Cloud  │
    │   (AI Parsing)   │  │                  │
    │                  │  │  • Auth (Google)  │
    │  gemini-3.1-     │  │  • Firestore DB  │
    │  flash-lite      │  │                  │
    └──────────────────┘  └──────────────────┘
```

### Data Flow

```
WhatsApp Order (text/image)
        │
        ▼
   ┌─────────┐     ┌──────────────────────┐
   │  Input  │────▶│  Gemini AI Engine    │
   │  View   │     │                      │
   └─────────┘     │  1. OCR (images)     │
                   │  2. Parse items      │
                   │  3. Match to DB      │
                   │  4. Group by market  │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Post-Processing     │
                   │                      │
                   │  • Fuzzy matching    │
                   │  • Auto-create new   │
                   │    restaurants       │
                   │  • Auto-add aliases  │
                   │  • Link ingredients  │
                   │    to restaurants    │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Firestore (Cloud)   │
                   │                      │
                   │  users/{uid}/        │
                   │    ├── markets/      │
                   │    ├── ingredients/  │
                   │    ├── restaurants/  │
                   │    │   └── ingr./   │
                   │    └── history/     │
                   │        └── {date}   │
                   └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | React | 19.2 |
| **Bundler** | Vite | 7.3 |
| **AI/LLM** | Google Gemini | 3.1-flash-lite |
| **Auth** | Firebase Authentication | 12.10 |
| **Database** | Cloud Firestore | 12.10 |
| **Routing** | React Router DOM | 7.13 |
| **Icons** | Lucide React | 0.577 |
| **Hosting** | Netlify (CDN) | — |
| **VCS** | GitHub | — |
| **Domain** | Cloudflare DNS | — |

---

## Project Structure

```
shopping-organizer/
├── index.html                    # SPA entry point
├── vite.config.js                # Vite config (React plugin)
├── netlify.toml                  # Netlify build + SPA redirects
├── package.json                  # Dependencies & scripts
├── .env                          # Firebase config (not committed)
│
├── public/                       # Static assets
│
├── src/
│   ├── main.jsx                  # React DOM render
│   ├── App.jsx                   # Root component (routing + auth guard)
│   ├── App.css                   # App-level overrides
│   ├── index.css                 # Design system (tokens, utilities, components)
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx       # Firebase auth provider (Google sign-in)
│   │
│   ├── services/
│   │   ├── firebaseConfig.js     # Firebase init (env vars)
│   │   ├── storageService.js     # Firestore CRUD + fuzzy matching
│   │   └── geminiService.js      # Gemini API integration + post-processing
│   │
│   └── pages/
│       ├── LoginPage.jsx         # Google sign-in UI
│       ├── InputView.jsx         # Order input (text + image upload)
│       ├── ShoppingListView.jsx  # Active shopping list with checkboxes
│       ├── HistoryView.jsx       # Past shopping lists by date
│       └── SettingsView.jsx      # Admin: markets, ingredients, restaurants
│
└── dist/                         # Production build output (not committed)
```

---

## Features

### 🔐 Authentication
- Google Sign-In via Firebase Auth
- Per-user data isolation in Firestore (`users/{uid}/...`)
- Persistent sessions across devices

### 📝 Order Input
- **Text input**: Paste raw WhatsApp messages (tab-separated, space-separated, or freeform)
- **Image upload**: Upload screenshots or photos of handwritten orders
- Multi-order support: process multiple restaurants in one go
- Auto-merge with existing daily list

### 🤖 AI Processing (Gemini)
- Uses `gemini-3.1-flash-lite-preview` for OCR + NLP
- System prompt includes full database context (markets, ingredients, restaurants)
- Output: structured JSON with market grouping, quantities, and restaurant attribution
- **Post-processing pipeline**:
  - Fuzzy matches new items against existing ingredients (Sørensen-Dice coefficient, threshold ≥ 0.6)
  - Auto-creates new restaurant entries when unseen names appear
  - Auto-adds aliases when fuzzy match finds a variant spelling
  - Links ingredients to restaurants for future reference

### 🛒 Shopping List
- Grouped by **market/vendor** for efficient shopping routes
- Expandable per-item view showing which restaurants ordered what quantity
- **Checkbox**: mark items done while shopping (saved in real-time)
- **Price input**: record actual price paid per item (IDR formatting)
- **Delete**: remove individual items or entire markets
- **Clear all**: reset the day's list

### 📊 History
- Browse past shopping lists by date
- View per-date totals and breakdowns
- Track spending over time

### ⚙️ Settings (Admin Panel)
- **Markets**: CRUD for market/vendor locations + reordering
- **Ingredients**: Manage canonical names, aliases, and market assignments
- **Restaurants**: Manage restaurant list, view linked ingredients
- **Lock system**: Lock restaurants/ingredients to prevent AI auto-modification
- **Gemini API Key**: Stored in `localStorage` (never synced to cloud)

---

## Firestore Data Model

```
users/{uid}/
│
├── markets/{marketId}
│   ├── name: string              # e.g., "Pasar Kosambi"
│   └── order: number             # Display order
│
├── ingredients/{ingredientId}
│   ├── canonicalName: string     # Standardized name (e.g., "Bawang Merah Batu Kupas")
│   ├── aliases: string[]         # Variant names ["b merah kupas", "bamer kupas"]
│   └── marketId: string          # Which market sells this
│
├── restaurants/{restaurantId}
│   ├── name: string              # e.g., "GulaPadi Bandung"
│   ├── isLocked: boolean         # Prevent AI auto-updates
│   └── ingredients/{linkId}
│       ├── ingredientId: string  # Reference to ingredients collection
│       └── isLocked: boolean     # Prevent AI removal
│
└── history/{YYYY-MM-DD}
    └── list: [                   # Daily shopping list snapshot
          {
            pasar: "Pasar Kosambi",
            barang: [
              {
                namaBarang: "Bawang Merah",
                namaAsli: "b merah kupas",
                totalKuantitas: "5kg",
                done: false,
                price: 45000,
                pemesan: [
                  { restoran: "GulaPadi", kuantitas: "3kg" },
                  { restoran: "Tjap Ajam", kuantitas: "2kg" }
                ]
              }
            ]
          }
        ]
```

---

## Fuzzy Matching Algorithm

The app uses the **Sørensen-Dice coefficient** for string similarity:

```
Dice(s1, s2) = 2 × |intersection of bigrams| / (|bigrams(s1)| + |bigrams(s2)|)
```

- Strings are normalized: lowercase, non-alphanumeric stripped
- Both canonical names and aliases are checked
- **Threshold ≥ 0.6** = considered a match
- When a match is found with a different spelling, the variant is auto-added as an alias

This runs **client-side** with zero latency, no API calls needed for matching.

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A Google account
- A [Firebase project](https://console.firebase.google.com/) with:
  - Authentication (Google provider enabled)
  - Firestore Database

### Installation

```bash
# Clone the repository
git clone https://github.com/LiveryPinn/shopping-organizer.git
cd shopping-organizer

# Install dependencies
npm install

# Configure Firebase
cp .env.example .env
# Edit .env with your Firebase project credentials
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Development

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

---

## Deployment

### Netlify (Current Setup)

Auto-deploy is configured via GitHub integration:

1. Push to `main` branch → Netlify auto-builds
2. Build command: `npm run build`
3. Publish directory: `dist`
4. SPA redirects configured in `netlify.toml`

Environment variables are set in Netlify dashboard (Project settings → Environment variables).

### Manual Deploy

```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## CI/CD Pipeline

```
Developer pushes to main
        │
        ▼
GitHub webhook → Netlify
        │
        ▼
npm run build (Vite)
        │
        ▼
Deploy to CDN
        │
        ▼
Live at belanja.nexai.art
```

---

## Companion Tool: Python Order Matcher

Located in `../new/order_matcher.py`, this is a standalone CLI tool for offline batch processing:

- Uses `rapidfuzz` for fuzzy matching against a CSV database (1,131+ raw name variants → 542 standardized ingredients)
- Supports `--save`, `--date`, `--list`, `--html` flags
- Generates print-friendly A4 HTML shopping lists
- Order history stored in `order_history.json`

This tool was the prototype that informed the web app's matching logic.

---

## Security Considerations

| Aspect | Implementation |
|---|---|
| **Authentication** | Firebase Auth (Google OAuth 2.0) |
| **Data isolation** | Firestore rules should enforce `users/{uid}` access |
| **API key storage** | Gemini API key stored in `localStorage`, never synced |
| **Firebase config** | Client-side config is safe to expose (restricted by Firebase rules) |
| **Environment vars** | `.env` is gitignored; production vars set in Netlify dashboard |

> ⚠️ **TODO**: Firestore security rules should be configured to restrict read/write access to authenticated users only, scoped to their own `users/{uid}` path.

---

## Future Roadmap

- [ ] Firestore security rules hardening
- [ ] PWA support (installable, offline-capable)
- [ ] Push notifications for new orders
- [ ] Export shopping lists as PDF
- [ ] Multi-user role management (admin vs. shopper)
- [ ] Cost analytics dashboard
- [ ] WhatsApp Business API direct integration

---

## License

Private — © PT Pelita Nirmala Grahadipa / NexAI

---

## Author

Built by **NexAI Agency** — AI-powered business automation solutions.
