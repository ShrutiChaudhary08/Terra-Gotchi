<div align="center">

# 🌱 Terra-Gotchi 🌍

### *The digital pet that only eats real grass.*

**A 100% offline, multimodal AI companion that makes you go outside.**

![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-ff69b4?style=for-the-badge)
![Challenge](https://img.shields.io/badge/Challenge-Touch%20Grass-2ea44f?style=for-the-badge)
![Offline](https://img.shields.io/badge/100%25-Offline-0a7ea4?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local%20AI-black?style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-Embedded-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

</div>

---

## 📖 Table of Contents

- [✨ What is Terra-Gotchi?](#-what-is-terra-gotchi)
- [🎮 How It Works](#-how-it-works)
- [🚀 Key Features](#-key-features)
- [🧰 Tech Stack](#-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🕹️ Usage](#️-usage)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [👩‍💻 Author](#-author)

---

## ✨ What is Terra-Gotchi?

Virtual pets have always asked the same thing of us: *more screen time.* **Terra-Gotchi flips the script.**

Terra-Gotchi is an **offline, multimodal AI digital pet** built for the **Hacktoberfest 2026 "Touch Grass" challenge**. You can't feed it by tapping a button. Instead, your pet *craves* something from the real world:

> 🗣️ *"I'm so hungry... find me a **green leaf**!"*
> 🗣️ *"I want something **rough**, like **tree bark**!"*

To feed it, you have to **put the phone down, walk outside, find the object, and photograph it.** A local vision AI then acts as the judge: does your photo actually match the craving? Only then does your pet eat. 🍃

No cloud. No Wi-Fi. No subscriptions. Just you, your pet, and the great outdoors.

---

## 🎮 How It Works

```text
   🐾 Pet gets hungry
          │
          ▼
   🧠 Gemma generates a craving ("Find me a green leaf!")
          │
          ▼
   🔊 Pet speaks the craving out loud (hands-free)
          │
          ▼
   🚶 You go outside and find the real thing
          │
          ▼
   📸 Snap a photo (live camera or file upload)
          │
          ▼
   👁️ LLaVA judges: does the photo match the craving?
          │
     ┌────┴────┐
     ▼         ▼
  ✅ Yes     ❌ No
  Pet eats,  Pet is
  is happy   unimpressed. Try again!
```

---

## 🚀 Key Features

### 📡 100% Offline Architecture
Everything runs locally through **Ollama**. There are no cloud APIs, no accounts and no paid subscriptions, so it works in the middle of a forest with zero signal.

### 🧠 Multimodal AI
Two local models, two jobs:
- **`gemma:2b`** powers the pet's personality, moods and cravings.
- **`llava`** is the vision judge that verifies your photo against the craving.

### 📷 Live WebRTC Camera
The frontend accesses your device camera directly to capture live snapshots. A **file upload fallback** is included for devices or browsers where camera access isn't available.

### 🔊 Hands-Free Audio
Using the browser's **Web Speech API**, the pet speaks its cravings out loud, so you can keep your eyes up and your screen in your pocket.

### 💾 Local Memory
Interaction history and pet status are stored in an embedded **SQLite** database, securely on your own device. Nothing leaves your machine.

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| 🤖 **AI Engine** | [Ollama](https://ollama.com) | Runs local models on-device |
| 🧠 **Personality / Logic** | `gemma:2b` | Generates cravings and pet dialogue |
| 👁️ **Vision Verification** | `llava` | Judges whether the photo matches the craving |
| ⚙️ **Backend** | Python + Flask | API routes and orchestration |
| 🗄️ **Database** | SQLite (embedded) | Pet status and interaction history |
| 🎨 **Frontend** | HTML, CSS, Vanilla JavaScript | UI, camera capture, speech |
| 🖼️ **Image Processing** | Pillow (PIL) | Preparing photos for the vision model |

---

## 🏗️ Architecture

```text
┌──────────────────────────── Browser ────────────────────────────┐
│  HTML / CSS / Vanilla JS                                         │
│  📷 WebRTC camera  ·  📁 Upload fallback  ·  🔊 Web Speech API  │
└───────────────────────────────┬──────────────────────────────────┘
                                │  HTTP (localhost)
┌───────────────────────────────▼──────────────────────────────────┐
│  Flask backend (app.py)                                          │
│  Pillow image prep  ·  Game logic  ·  SQLite storage 💾          │
└───────────────────────────────┬──────────────────────────────────┘
                                │  Ollama client
┌───────────────────────────────▼──────────────────────────────────┐
│  Ollama (local)                                                  │
│  🧠 gemma:2b  (personality)    👁️ llava  (vision judge)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Installation & Setup

### 📋 Prerequisites

- **Python 3.14.5** and `pip`
- **[Ollama](https://ollama.com/download)** installed on your system
- A device with a camera (or images to upload)
- A reasonably modern machine: running two local models needs a decent amount of RAM, and `llava` is the heavier of the two

### 1️⃣ Clone the repository

```bash
git clone https://github.com/ShrutiChaudhary08/Terra-Gotchi.git
cd Terra-Gotchi
```

### 2️⃣ Create a virtual environment & install dependencies

```bash
# Create the environment
python -m venv venv

# Activate it
# macOS / Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies (Flask, ollama, Pillow)
pip install -r requirements.txt
```

### 3️⃣ Install Ollama & pull the models

Install Ollama from [ollama.com/download](https://ollama.com/download), then pull both models:

```bash
ollama pull gemma:2b
ollama pull llava
```

> 💡 **Tip:** You need internet only for this one-time download. After the models are pulled, Terra-Gotchi runs fully offline.

### 4️⃣ Run the app

```bash
python app.py
```

Then open **http://127.0.0.1:5000** in your browser. 🎉

---

## 🕹️ Usage

1. 🐣 **Meet your pet.** Open the app and check on its status.
2. 👂 **Listen to the craving.** The pet speaks what it wants ("Find me a green leaf!").
3. 🚶 **Touch grass.** Go outside and find the real-world item.
4. 📸 **Snap it.** Use the live camera, or upload a photo.
5. ⚖️ **Face the judge.** `llava` checks whether your photo matches the craving.
6. 💚 **Feed & repeat.** Match it and your pet eats. Miss it and you'll have to look harder.

---

## 🗺️ Roadmap

- [ ] 🎧 **EchoCatch (Audio Cravings):** local audio classification so the pet can crave ambient nature sounds, like wind or birdsong. Users record audio in the wild to feed it.
- [ ] 🌤️ **Dynamic Weather Context:** offline logic that adjusts cravings based on time of day (for example, asking you to find *shadows* at noon).

Have an idea? Open an issue. This is a Hacktoberfest project, after all. 🎃

---

## 🤝 Contributing

Contributions are welcome, especially during **Hacktoberfest**!

1. 🍴 Fork the repo
2. 🌿 Create a branch: `git checkout -b feature/amazing-idea`
3. 💬 Commit your changes: `git commit -m "Add amazing idea"`
4. 🚀 Push the branch: `git push origin feature/amazing-idea`
5. 🔃 Open a Pull Request

Good first contributions: new craving ideas, UI polish, accessibility improvements, or help with the roadmap items above.

---

## 👩‍💻 Author

**Built with 💚 by Shruti**

---

<div align="center">

### 🌳 Now close the laptop and go touch some grass. 🌳

*Your pet is hungry.*

</div>