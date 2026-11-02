# 🌱 Terra-Gotchi 🌍

### *Feed your pet. Explore your world. Discover nature.*

**A portfolio-quality full-stack AI platform that encourages real-world outdoor exploration by transforming physical nature discoveries into nutrition for an evolving virtual companion.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Gemini 3.8 Flash](https://img.shields.io/badge/Gemini%20AI-Multimodal%20Vision-8E75C4?style=for-the-badge&logo=google)](https://aistudio.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless%20Ready-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

## 📖 Table of Contents

1. [Problem Statement & Core Concept](#-problem-statement--core-concept)
2. [System Architecture](#-system-architecture)
3. [Key Features](#-key-features)
4. [Multimodal AI & Verification Methodology](#-multimodal-ai--verification-methodology)
5. [Pet Progression & Evolution Mechanics](#-pet-progression--evolution-mechanics)
6. [Database Schema & RLS Security](#-database-schema--rls-security)
7. [REST API Documentation](#-rest-api-documentation)
8. [Installation & Local Setup](#-installation--local-setup)
9. [Supabase Setup Guide](#-supabase-setup-guide)
10. [Vercel Deployment Guide](#-vercel-deployment-guide)
11. [Automated Testing](#-automated-testing)

---

## 💡 Problem Statement & Core Concept

Virtual pets have historically demanded more screen time. **Terra-Gotchi flips the script.**

Its core philosophy is simple:
> **Technology should bring people closer to nature, not further away from it.**

Terra is a digital companion that survives solely by consuming real-world botanical and geological textures. To feed it, users cannot simply tap a button. Instead:

1. **Craving Generated**: Terra asks for an outdoor specimen (e.g. *"Find a serrated green leaf with distinct branching veins"*).
2. **Real-world Exploration**: The user walks outside into their garden, park, or trail.
3. **Capture & Analysis**: Using the device's live camera or photo upload, the user captures the specimen.
4. **Gemini Vision Verification**: Google Gemini 3.8 Flash evaluates the image using computer vision.
5. **Reward & Evolution**: If verified, Terra is fed, XP is awarded, hunger drops, and the specimen is archived in the permanent Nature Journal.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                                CLIENT                                  │
│  React 18  ·  TypeScript  ·  Tailwind CSS  ·  WebRTC Camera · Speech  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTPS API Requests              │ Supabase Client SDK
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        VERCEL / NODE.JS API          │  │       SUPABASE CLOUD         │
│  /api/pet                            │  │  PostgreSQL (8 tables)       │
│  /api/challenges/generate            │  │  Row Level Security (RLS)    │
│  /api/pet/feed (Multimodal)          │  │  Auth (Email + Google OAuth) │
│  /api/journal                        │  │  Storage ('nature_photos')   │
│  /api/achievements                   │  └──────────────┬───────────────┘
└──────────────────┬───────────────────┘                 │
                   │ Server-Side SDK                     │ Storage URLs
                   ▼                                     │
┌──────────────────────────────────────┐                 │
│      GOOGLE GEMINI 3.8 FLASH         │                 │
│  • Nature Challenge Generation       │                 │
│  • Multimodal Vision Verification    │◄────────────────┘
│  • Botanical Feature Recognition     │
└──────────────────────────────────────┘
```

---

## ✨ Key Features

- **Multimodal AI Vision Judge**: Submissions are examined by Gemini 3.8 Flash for authenticity, texture resolution, outdoor setting, and botanical traits.
- **Dynamic Growth Stages**: Pet evolves across 5 distinct visual stages (`Seedling` → `Sprout` → `Explorer` → `Forest Friend` → `Nature Guardian`).
- **Interactive Expressions**: Expressive moods including Sleeping, Thinking, Hungry, Happy, Celebrating, and Disappointed.
- **Nature Journal / Herbarium**: Permanent cloud archive with date, XP, confidence score, and category filters.
- **Achievement & Streak Engine**: Milestones like *First Discovery*, *Green Explorer*, *Pattern Hunter*, and consecutive day streaks.
- **Hands-Free Audio**: Browser Web Speech synthesis speaks cravings and pet gratitude aloud.
- **Responsive Dual Camera**: Live WebRTC camera viewfinder with environment/user lens toggle and file upload fallback.
- **Dual Mode (Cloud & Guest)**: Seamless Guest mode with full functionality and instant Supabase cloud sync when credentials are provided.

---

## 🧠 Multimodal AI & Verification Methodology

All AI interactions run strictly server-side through `@google/genai` (SDK >= 2.25.0) using the `gemini-3.8-flash` model.

### 1. Challenge Generation (`generateAICraving`)
Takes pet level, pet name, and historical challenges to synthesize non-repetitive outdoor objectives with enforced schema constraints:

```json
{
  "challenge": "Find a leaf with visible veins",
  "category": "Plant Patterns",
  "difficulty": "Easy",
  "xp_reward": 25,
  "description": "Look closely at a fallen or living leaf to find intricate branched vein patterns."
}
```

### 2. Multimodal Verification (`verifyImageSubmission`)
Sends the photograph base64 buffer and structured evaluation prompt to Gemini:
- Evaluates if the photograph clearly depicts the natural element.
- Rejects computer screens, plastic objects, indoor rooms, or blurry images.
- Enforces an authenticity confidence threshold ($\ge 0.65$).
- Returns structured evaluation with detected specimen, factual reason, and pet feedback.

---

## 📈 Pet Progression & Evolution Mechanics

| Level | Growth Stage | XP Range | Visual Characteristics |
|:-----:|:-------------|:--------:|:-----------------------|
| **1** | **Seedling** | 0 – 99 | Tender single green sprout |
| **2** | **Sprout** | 100 – 249 | Two leafy branches, curious eyes |
| **3** | **Explorer** | 250 – 449 | Clover foliage & golden bud |
| **4** | **Forest Friend** | 450 – 699 | Forest crown with vibrant mushroom cap |
| **5+**| **Nature Guardian**| 700+ | Antler leafy branches & glowing aura |

---

## 🗄️ Database Schema & RLS Security

The database runs on Supabase PostgreSQL with 8 organized tables and Row Level Security:

1. `profiles`: User preferences (audio, display name, preferred camera).
2. `pets`: Pet level, XP, happiness, hunger, energy, streak, growth stage.
3. `challenges`: Active and completed nature cravings with XP values.
4. `feeding_attempts`: Raw verification audit trail for every submission.
5. `nature_journal`: Permanent verified discoveries with photo URLs.
6. `achievements`: Catalog of milestones and rewards.
7. `user_achievements`: User-unlocked achievement records.
8. `daily_activity`: Daily feed counts for streak tracking.

The complete SQL migration is located at:
```bash
supabase/migrations/001_initial_schema.sql
```

---

## 🔌 REST API Documentation

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/pet` | Fetches pet vitals, level, and active craving |
| `PUT` | `/api/pet` | Renames pet companion |
| `POST`| `/api/challenges/generate` | Generates a new context-aware nature craving |
| `POST`| `/api/challenges/verify` | Standalone vision verification without state change |
| `POST`| `/api/pet/feed` | Verified multimodal feed: updates XP, vitals, streaks, and journal |
| `GET` | `/api/journal` | Lists user's nature discoveries |
| `DELETE` | `/api/journal/:id` | Deletes a journal discovery |
| `GET` | `/api/achievements` | Returns achievement catalog and unlocked status |
| `GET` | `/api/health` | Service health and AI connectivity status |

---

## 🚀 Installation & Local Setup

### Prerequisites
- Node.js 20+ and `npm`
- Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/))
- *(Optional)* Free Supabase project (from [supabase.com](https://supabase.com/))

### 1. Clone & Install
```bash
git clone https://github.com/ShrutiChaudhary08/Terra-Gotchi.git
cd Terra-Gotchi
npm install
```

### 2. Configure Environment
Create `.env` using `.env.example`:
```bash
cp .env.example .env
```
Fill in your credentials:
```ini
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## ⚡ Supabase Setup Guide

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` and run it.
4. Copy your **Project URL** and **Anon Public Key** from **Project Settings > API**.
5. Add them to your `.env` or deployment settings as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 🌐 Vercel Deployment Guide

1. Push your repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your `Terra-Gotchi` GitHub repository.
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel will build the Vite frontend and deploy the serverless functions in `/api`.

---

## 🧪 Automated Testing

Unit tests for game mechanics, leveling curves, streak algorithms, and achievement unlocking are written with `vitest`:

```bash
npm test
```

---

## 👩‍💻 Credits

Built with 💚 by **Shruti**.  
Powered by Google Gemini AI and Supabase.