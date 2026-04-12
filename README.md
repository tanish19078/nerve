# Nerve

> *"Feel the market. Not the fear."*

**Nerve** is a zero-risk investment education platform that helps young users overcome investing fear through simulation, AI-powered explanations, and data-driven probability visualization.

Built for the **Finvasia Hackathon** — Problem Statement 3: Investing Fear.

---

## The Problem

Young users (18–30) fear investing due to **fear of financial loss**. This prevents them from building wealth and achieving financial independence.

## Our Solution

If investing risk is **contextualized** and loss is **simulated before real exposure**, fear can be reduced.

### Three Core Features

| Feature | What It Does |
|---------|-------------|
| **Risk Simulation Sandbox** | Experience real market scenarios (bull runs, crashes) with virtual money — zero real risk |
| **AI Portfolio Explainer** | Gemini-powered AI that explains your portfolio, risk score, and market events in plain English |
| **Loss Probability Meter** | See the actual historical probability of loss across different time horizons |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Vanilla CSS with CSS Custom Properties
- **Charts:** Recharts
- **AI:** Google Gemini API
- **Animations:** Framer Motion
- **Deployment:** Vercel

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Google Gemini API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-team/nerve.git
cd nerve

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `NEXT_PUBLIC_APP_NAME` | No | App display name (default: Nerve) |

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.js           # Landing page
│   ├── onboard/          # Risk quiz + portfolio selection
│   ├── dashboard/        # Main hub
│   ├── sandbox/          # Simulation engine
│   ├── explain/          # AI chat interface
│   ├── probability/      # Loss probability meter
│   ├── results/          # Post-simulation results
│   └── progress/         # Confidence tracking
├── components/           # Reusable components
├── context/              # React Context providers
├── hooks/                # Custom hooks
├── lib/                  # Utility functions
└── styles/               # Global styles & design tokens
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Deployment

This project is optimized for **Vercel**:

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

---

## Disclaimer

> This platform is for **educational purposes only**. It does not provide financial advice. All simulations use historical data and virtual currency. Past performance does not guarantee future results.

---

## Team

Built with determination for the Finvasia Hackathon 2026.

---

## License

MIT
