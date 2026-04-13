# Nerve

> *"Feel the market. Not the fear."*

**Nerve** is a zero-risk investment education platform that helps young users overcome investing fear through simulation, AI-powered explanations, and data-driven probability visualization.

Built for the **Finvasia Hackathon 2026** — Problem Statement 3: Investing Fear.

---

## The Problem

Young users (18–30) often fear investing due to the **fear of financial loss**. This psychological barrier prevents them from building long-term wealth and achieving financial independence.

## Our Solution

If investing risk is **contextualized** and loss is **simulated before real exposure**, fear can be reduced. Nerve provides a safe "sandbox" where users can fail and learn without actual financial consequences.

### Three Core Features

| Feature | What It Does |
|---------|-------------|
| **Risk Simulation Sandbox** | Experience real market scenarios (bull runs, crashes) with virtual money — zero real risk. |
| **AI Portfolio Explainer** | **Llama 3.1** powered AI (via Groq) that explains your portfolio, risk score, and market events in plain, encouraging language. |
| **Loss Probability Meter** | See the actual historical probability of loss across different time horizons to build confidence with data. |

---

## Tech Stack

- **Framework:** Node.js + Express
- **Frontend:** Vanilla HTML/JS with CSS Custom Properties
- **AI Engine:** Groq SDK (Meta Llama 3.1 8B Instant)
- **Charts:** Custom CSS and JS-driven visualizations
- **Deployment:** Vercel

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- [Groq API Key](https://console.groq.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/tanish19078/nerve.git
cd nerve

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY
```

### Running Locally

```bash
# Start development server
npm run dev
```

The server will be running on [http://localhost:8080](http://localhost:8080).

---

## Project Structure

```
.
├── pages/              # Static HTML interface
│   ├── index.html      # Landing page
│   ├── dashboard.html  # Main feature hub
│   ├── ai-chat.html    # AI integration interface
│   └── ...             # Other feature pages
├── public/             # Static assets
│   ├── css/            # Global styling and design system
│   ├── js/             # Dashboard and simulation logic
│   └── data/           # Market data and scenario JSONs
├── server.js           # Express backend and AI API integration
├── .env.local          # Environment variables (local dev)
└── .env.example        # Environment variable template
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | **Yes** | Groq API key for Llama 3.1 AI features |
| `NEXT_PUBLIC_APP_NAME` | No | App display name (default: Nerve) |

---

## Disclaimer

> This platform is for **educational purposes only**. It does not provide financial advice. All simulations use historical data and virtual currency. Past performance does not guarantee future results.

---

## Team

Built with determination for the Finvasia Hackathon 2026.

---

## License

MIT
