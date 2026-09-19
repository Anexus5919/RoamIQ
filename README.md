<div align="center">
  
# RoamIQ - AI-Powered Travel Planning Platform

</div>
<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-61dafb?style=for-the-badge&logo=react)
![SerpApi](https://img.shields.io/badge/SerpApi-Live_Search_Data-4285F4?style=for-the-badge&logo=google)
![Groq](https://img.shields.io/badge/Groq-gpt--oss--120b-f55036?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4.1-38bdf8?style=for-the-badge&logo=tailwind-css)

**Transform your travel dreams into detailed, personalized itineraries with the power of AI**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture)

</div>

---

## 📖 Overview

RoamIQ is an intelligent travel planning platform that turns **live search data from SerpApi** into comprehensive, day-by-day travel itineraries. Real flight fares, real hotel rates, real restaurants and real news are fetched first; a Groq-hosted LLM then writes the plan around those verified facts. The result is an itinerary you can actually book, not one the model invented.

### 🔍 **How SerpApi powers RoamIQ**

Every number a user sees — every fare, nightly rate, rating and review count — comes from SerpApi and is passed to the UI **verbatim**. The language model never generates prices or place names; it only writes narrative around data that was already verified.

| SerpApi engine | What it powers in the app |
|---|---|
| `google_flights` | Real fares, airlines, durations, stops and CO₂ estimates |
| `google_flights_autocomplete` | Resolves typed city names to IATA airport codes |
| `google_maps` | Geocodes origin and destination for the 3D globe |
| `google_hotels` | Nightly rates, star class, ratings, deals and photos |
| `google_maps_directions` | Road distance and drive time between origin and destination |
| `google_local` | Highly rated restaurants and attractions at the destination |
| `google_news` | "Before You Go" advisories and recent destination coverage |
| `google_travel_explore` | The Trip Inspiration page — live destinations and fares by origin |

All calls funnel through [`lib/serpapi.js`](lib/serpapi.js), which adds a TTL cache so repeat lookups don't burn search credits.

---

## ✨ Features

### 🤖 **AI-Powered Planning**
- **Real-time streaming** AI responses with progress indicators
- **Personalized itineraries** based on interests, budget, and travel style
- **Chain-of-thought display** showing AI reasoning process

### 🗺️ **Interactive Visualizations**
- **3D Globe** with animated flight paths using react-globe.gl
- **Progressive data loading** - see results as they're generated
- **Responsive design** optimized for all devices

### 🌤️ **Real-Time Data Integration**
- **Live flight fares** with airlines, stops and carbon estimates
- **Live hotel rates** filtered by budget, with ratings and photos
- **Road distance and drive time** between origin and destination
- **Restaurants and attractions** pulled from Google Local
- **Destination news** surfaced as a pre-trip advisory
- **Weather forecasts** for destination cities

### 🎨 **Modern UI/UX**
- **Dark/Light mode** with seamless theme switching
- **Frosted glass effects** and smooth animations
- **shadcn/ui components** for consistent design
- **Lucide React icons** throughout

### 📱 **Smart Features**
- **Suggested trips** discovered live, with real fares by departure city
- **Plan new trip** directly from itinerary page
- **Interest tags** with pill-based input system
- **Date range picker** with validation

---

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 15.5.6** - React framework with App Router
- **React 19.1.0** - UI library
- **Tailwind CSS 3.4.1** - Utility-first styling
- **Framer Motion** - Animations and transitions
- **shadcn/ui** - Component library
- **Lucide React** - Icon system
- **react-globe.gl** - 3D globe visualization

### **Backend & APIs**
- **SerpApi** - Live flights, hotels, directions, places, news and destinations
- **Groq** - Hosted LLM inference (`openai/gpt-oss-120b`) with token streaming
- **TomTom API** - Optional geocoding fallback for the 3D globe
- **OpenWeather API** - Weather forecasts

### **State Management & Utilities**
- **Context API** - Global state management
- **next-themes** - Theme management
- **date-fns** - Date manipulation

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### **Required**
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager

No local model server is needed — inference runs on Groq.

### **API Keys** (Required for full functionality)
- **SerpApi Key** - [Get here](https://serpapi.com/) — the free plan includes 250 searches/month and covers every engine RoamIQ uses, flights and hotels included
- **Groq API Key** - [Get here](https://console.groq.com/)
- **TomTom API Key** - [Get here](https://developer.tomtom.com/) — optional; only used as a geocoding fallback
- **OpenWeather API Key** - [Get here](https://openweathermap.org/api)

---

## 🚀 Installation

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/Anexus5919/RoamIQ.git
cd RoamIQ
```

### **Step 2: Install Dependencies**

```bash
npm install
# or
yarn install
```

### **Step 3: Configure Environment Variables**

Create a `.env.local` file in the root directory:

```env
# Live search data — powers flights, hotels, places, news and discovery
SERPAPI_API_KEY=your_serpapi_key_here

# LLM inference
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b   # optional, this is the default

# Geocoding for the 3D globe
# Optional geocoding fallback (SerpApi handles this by default)
TOMTOM_API_KEY=your_tomtom_api_key_here

# Weather forecasts
OPENWEATHER_API_KEY=your_openweather_key_here
```

> **Note on search credits:** a fresh itinerary costs about 5–7 SerpApi searches.
> `lib/serpapi.js` caches every response, so repeated lookups for the same city
> are free until the TTL expires.

### **Step 4: Run the Development Server**

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Architecture

### **Project Structure**

```
RoamIQ/
├── app/
│   ├── api/                    # API Routes
│   │   ├── itinerary/         # Live data + AI itinerary generation endpoint
│   │   ├── suggestions/       # Live destination discovery (Travel Explore)
│   │   └── weather/           # Weather forecast endpoint
│   │
│   ├── components/            # React Components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── ChainOfThoughtDisplay.jsx
│   │   ├── FlightOptions.jsx      # Live fares from Google Flights
│   │   ├── GlobeDisplay.jsx
│   │   ├── HotelSuggestions.jsx   # Live rates from Google Hotels
│   │   ├── ItineraryDisplay.jsx
│   │   ├── ItineraryForm.jsx
│   │   ├── LocalDining.jsx        # Restaurants from Google Local
│   │   ├── Navbar.jsx
│   │   ├── TravelAdvisory.jsx     # Destination news
│   │   └── ...
│   │
│   ├── context/              # React Context
│   │   └── ItineraryContext.js
│   │
│   ├── itinerary/            # Itinerary results page
│   │   └── page.js
│   │
│   ├── suggestions/          # Suggested trips page
│   │   └── page.jsx
│   │
│   ├── layout.js             # Root layout
│   ├── page.js               # Landing page
│   ├── providers.jsx         # Context providers
│   └── globals.css           # Global styles
│
├── lib/                      # Utility functions
│   ├── serpapi.js            # SerpApi client + TTL cache (all live data)
│   └── utils.js              # Helper utilities
│
├── public/                   # Static assets
│
├── .env.local               # Environment variables
└── package.json             # Dependencies
```

### **Data Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  LANDING PAGE (app/page.js)                                 │
│  - ItineraryForm collects user input                        │
│  - Stores formData in ItineraryContext                      │
│  - Navigates to /itinerary                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ITINERARY PAGE (app/itinerary/page.js)                     │
│  - Retrieves formData from context                          │
│  - Displays progress with ChainOfThoughtDisplay             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  API ROUTE (app/api/itinerary/route.js)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 1. Geocode locations (google_maps, cached 30 days)      ││
│  │ 2. Fetch live data from SerpApi, all in parallel:       ││
│  │      google_flights · google_hotels                     ││
│  │      google_maps_directions · google_local · news       ││
│  │ 3. Stream that payload to the client IMMEDIATELY        ││
│  │ 4. Ask Groq to write the day plan around those facts    ││
│  │ 5. Stream the AI tokens after the live-data delimiter   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  RESULTS DISPLAY                                            │
│  - GlobeDisplay: 3D visualization with flight path          │
│  - WeatherDisplay: Forecast for destination                 │
│  - TravelAnalysisDisplay: Distance & transport options      │
│  - FlightOptions: Live fares, stops, CO₂                    │
│  - HotelSuggestions: Live nightly rates, ratings, photos    │
│  - LocalDining: Rated restaurants near the destination      │
│  - TravelAdvisory: Recent destination news                  │
│  - ItineraryDisplay: Day-by-day plan                        │
└─────────────────────────────────────────────────────────────┘
```

Because the live payload is flushed before the model starts generating, the
globe, flights and hotels are on screen while the itinerary is still being
written.

### **Key Components Relationships**

#### **State Management (Context API)**
```
ItineraryContext
├── itinerary (full itinerary data)
├── formData (user input)
├── isLoading (loading state)
├── error (error messages)
├── streamingText (raw AI output)
└── cotSteps (progress steps)
```

#### **Page Flow**
1. **`/`** (Landing) → User fills form → Navigate to `/itinerary`
2. **`/itinerary`** → Fetch AI data → Display results
3. **`/suggestions`** → Browse live destinations by origin → Select → Auto-fill form

#### **API Integration**
- **SerpApi**: Flights, hotels, directions, restaurants, attractions, news and destination discovery
- **TomTom API**: Geocoding fallback only (SerpApi is primary)
- **OpenWeather**: Real-time weather forecasts
- **Groq**: Itinerary generation with token streaming

---

## 🎯 Usage

### **Creating an Itinerary**

1. **Navigate to the landing page** ([http://localhost:3000](http://localhost:3000))
2. **Fill in the form:**
   - **From:** Your starting location
   - **Destination:** Where you want to go
   - **Dates:** Start and end dates
   - **Budget:** Budget, Mid-range, or Luxury
   - **Transport:** Flight, Train, Car, or Any
   - **Interests:** Add tags (food, history, art, etc.)
3. **Click "Build My Itinerary"**
4. **Watch the AI generate** your plan in real-time
5. **View results:** Globe visualization, weather, hotels, and day-by-day itinerary

### **Using Suggested Trips**

1. Click **"I'm Feeling Lucky"** on the landing page
2. Browse curated destinations (Kyoto, Rome, Paris, etc.)
3. Click any card to auto-fill the form with that destination

### **Planning Another Trip**

From any itinerary page:
- Click **"Plan a New Trip"** button in the navbar
- Returns to landing page with fresh form

---

## 🔑 Environment Variables

Create a `.env.local` file with these variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SERPAPI_API_KEY` | SerpApi key — flights, hotels, places, news, discovery | ✅ Yes | - |
| `GROQ_API_KEY` | Groq key for itinerary generation | ✅ Yes | - |
| `TOMTOM_API_KEY` | Geocoding fallback if SerpApi returns nothing | ⚠️ Optional | - |
| `OPENWEATHER_API_KEY` | OpenWeather API key for forecasts | ✅ Yes | - |
| `GROQ_MODEL` | Override the Groq model | ⚠️ Optional | `openai/gpt-oss-120b` |

---

## 🐳 Deployment Notes

### **Important Considerations**

1. **Fully serverless-friendly:**
   - Inference runs on Groq and all data comes from HTTP APIs, so RoamIQ
     deploys to Vercel, Netlify or any Node host with no extra infrastructure.

2. **Search credits:**
   - A fresh itinerary costs roughly 5–7 SerpApi searches; the free plan
     allows 250/month at 50/hour.
   - `lib/serpapi.js` caches every response with a per-engine TTL, so demoing
     the same trip repeatedly costs nothing after the first run.

3. **No database required:**
   - Trip inspiration is served live from Google Travel Explore rather than a
     seeded collection, so there is nothing to provision or keep in sync.

### **Deploying**

```bash
npm run build
npm start
```

Set the four environment variables above in your host's dashboard.

---

## 👨‍💻 Developer

**Adarsh Singh**

- GitHub: [@Anexus5919](https://github.com/Anexus5919)
- LinkedIn: [linkedin.com/in/anexus](https://www.linkedin.com/in/anexus/)
- Email: anexus5919@gmail.com

---

## 🎓 Developed For

**Gradguide by Computrain**

---

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-Anexus5919-181717?style=for-the-badge&logo=github)](https://github.com/Anexus5919)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-anexus-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/anexus/)

</div>