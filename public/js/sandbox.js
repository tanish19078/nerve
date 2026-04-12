/**
 * Nerve Sandbox Simulation Engine v3.0
 * 
 * A complete market simulation engine with:
 * - Scenario selection (individual or full journey)
 * - Multi-asset portfolio tracking
 * - Progressive chart rendering (no future spoilers)
 * - Working speed controls
 * - Live P&L, drawdown, and holdings tracking
 * - Anxiety tracking that persists to results
 * - Trade logging (buy/sell history)
 */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════════════════════════════════════
    // DOM REFERENCES (all by ID — no fragile innerText matching)
    // ═══════════════════════════════════════════════════════════════════════════
    const $  = id => document.getElementById(id);
    const scenarioOverlay   = $('scenario-overlay');
    const scenarioGrid      = $('scenario-grid');
    const simMain           = $('sim-main');
    const simFooter         = $('sim-footer');
    const toastContainer    = $('toast-container');

    // Header
    const scenarioTitle     = $('scenario-title');
    const scenarioBadge     = $('scenario-badge');
    const scenarioDesc      = $('scenario-desc');
    const monthCounter      = $('month-counter');
    const monthLabel        = $('month-label');

    // Chart SVG elements
    const chartLine         = $('chart-line');
    const chartFill         = $('chart-fill');
    const chartDot          = $('chart-dot');
    const chartVLine        = $('chart-vline');
    const chartNowBg        = $('chart-now-bg');
    const chartNowText      = $('chart-now-text');

    // Stats
    const statPortfolioVal  = $('stat-portfolio-value');
    const statPnl           = $('stat-pnl');
    const statDrawdown      = $('stat-drawdown');

    // Controls
    const btnPlay           = $('btn-play');
    const btnReset          = $('btn-reset');
    const btnNewSim         = $('btn-new-sim');
    const speedBtns         = document.querySelectorAll('.speed-btn');
    const progressBar       = $('progress-bar');
    const timelineStart     = $('timeline-start');
    const timelineEnd       = $('timeline-end');

    // Holdings
    const holdingsList      = $('holdings-list');
    const cashDisplay       = $('cash-display');

    // Trade buttons
    const btnBuy            = $('btn-buy');
    const btnSell           = $('btn-sell');
    const btnHold           = $('btn-hold');

    // Anxiety
    const anxietySlider     = $('anxiety-slider');
    const anxietyLabel      = $('anxiety-label');

    // Insight
    const insightText       = $('insight-text');

    // Footer
    const footerProgressText = $('footer-progress-text');
    const milestoneBar      = $('milestone-bar');
    const btnExport         = $('btn-export');
    const btnEndSession     = $('btn-end-session');

    // Sidebar
    const enginePulse       = $('engine-pulse');
    const engineStatus      = $('engine-status');


    // ═══════════════════════════════════════════════════════════════════════════
    // SIMULATION STATE
    // ═══════════════════════════════════════════════════════════════════════════
    let allScenarios    = {};
    let activeScenario  = null;   // The selected scenario object
    let dataPoints      = [];     // Array of { label, niftyValue, change }
    let currentTick     = 0;
    let isPlaying       = false;
    let tickInterval    = null;
    let speed           = 1;      // 1x, 2x, 5x, 10x

    // Portfolio state
    const STARTING_CAPITAL = 100000;
    const MONTHLY_SIP      = 5000;
    let cash            = 0;
    let shares          = 0;      // Nifty shares (fractional)
    let goldUnits       = 0;
    let bondUnits       = 0;
    let totalInvested   = 0;
    let peakValue       = 0;
    let maxDrawdownPct  = 0;

    // User's portfolio type
    const portfolioType = localStorage.getItem('fearless_portfolio') || 'balanced';

    // Asset allocation weights per portfolio type
    const allocationWeights = {
        conservative: { equity: 0.15, gold: 0.15, bonds: 0.65, cash: 0.05 },
        balanced:     { equity: 0.50, gold: 0.15, bonds: 0.30, cash: 0.05 },
        aggressive:   { equity: 0.85, gold: 0.10, bonds: 0.05, cash: 0.00 }
    };
    // Support custom dream portfolio weights
    let weights;
    if (portfolioType === 'custom') {
        try {
            weights = JSON.parse(localStorage.getItem('custom_weights'));
            if (!weights || !weights.equity) throw 'invalid';
        } catch (e) {
            weights = allocationWeights.balanced;
        }
    } else {
        weights = allocationWeights[portfolioType] || allocationWeights.balanced;
    }

    // Trade log
    let tradeLog = [];

    // Anxiety tracking
    let anxietyScores = [];
    // Pull starting anxiety from fear quiz score (0-100 → 1-10 scale), fallback to 5
    const fearScore = parseInt(localStorage.getItem('fearless_score')) || 50;
    let startAnxiety = Math.max(1, Math.min(10, Math.round(fearScore / 10)));

    // Gold and bond price simulation (correlated to nifty)
    function getGoldPrice(niftyVal, baseNifty) {
        // Gold tends to be inversely correlated with equity during crashes
        const ratio = niftyVal / baseNifty;
        const inverseComponent = 1 + (1 - ratio) * 0.4; // Inverse correlation
        const baseGold = 45000; // Gold price per 10g
        return baseGold * inverseComponent * (0.95 + Math.random() * 0.10);
    }

    function getBondPrice(tick, totalTicks) {
        // Bonds are relatively stable, slight upward drift
        const baseBond = 1000; // NAV per unit
        return baseBond * (1 + (tick / totalTicks) * 0.06 + (Math.random() - 0.5) * 0.01);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // SCENARIO INSIGHTS
    // ═══════════════════════════════════════════════════════════════════════════
    const scenarioInsights = {
        'bull-run': [
            '"Bull markets reward patience. The best gains often come in sudden bursts that you miss if you\'re on the sidelines."',
            '"This rally was driven by stimulus spending and low interest rates — a once-in-a-decade event."',
            '"Even in a bull run, there are mini-dips. Smart investors use those dips to accumulate."'
        ],
        'market-crash': [
            '"Historical insight: Markets recovered from the COVID crash within 5 months. Panic selling crystallizes losses that time would have healed."',
            '"During the 2020 crash, investors who bought at the bottom saw 80%+ returns within 18 months."',
            '"The fastest crashes tend to have the fastest recoveries. Patience is your greatest asset."'
        ],
        'sideways': [
            '"Sideways markets test patience more than crashes. SIP investors actually benefit from accumulating at stable prices."',
            '"A monthly SIP of ₹10,000 during 2018-2019 would have beaten a lumpsum investment by 4%."',
            '"Boring markets are where disciplined investors build their advantage."'
        ],
        'full-journey': [
            '"The full journey shows why a 5+ year investment horizon dramatically reduces risk."',
            '"Through crash, recovery, and growth — staying invested always outperformed panic selling."',
            '"This 4-year cycle is a masterclass: fear → patience → reward."'
        ]
    };


    // ═══════════════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    function showToast(message, type = 'info') {
        const colors = {
            info:    'from-primary/20 border-primary/30 text-primary',
            success: 'from-[#10b981]/20 border-[#10b981]/30 text-[#10b981]',
            warning: 'from-[#f59e0b]/20 border-[#f59e0b]/30 text-[#f59e0b]',
            error:   'from-error/20 border-error/30 text-error'
        };
        const icons = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };

        const toast = document.createElement('div');
        toast.className = `toast flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r ${colors[type]} border backdrop-blur-xl text-sm font-bold`;
        toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${icons[type]}</span> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // SCENARIO SELECTION
    // ═══════════════════════════════════════════════════════════════════════════
    fetch('/public/data/scenarios.json')
        .then(r => r.json())
        .then(data => {
            allScenarios = data;
            renderScenarioCards();
        })
        .catch(err => {
            console.error('Failed to load scenarios:', err);
            showToast('Failed to load scenarios', 'error');
        });

    function renderScenarioCards() {
        scenarioGrid.innerHTML = '';

        const diffColors = {
            easy:   { bg: 'bg-[#10b981]/10', text: 'text-[#10b981]', border: 'border-[#10b981]/30', glow: 'shadow-[#10b981]/10' },
            medium: { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30', glow: 'shadow-[#f59e0b]/10' },
            hard:   { bg: 'bg-error/10',     text: 'text-error',     border: 'border-error/30',     glow: 'shadow-error/10' }
        };

        // Individual scenarios
        Object.entries(allScenarios).forEach(([key, sc]) => {
            const dc = diffColors[sc.difficulty] || diffColors.medium;
            const card = document.createElement('div');
            card.className = `scenario-card cursor-pointer glass-panel rounded-2xl p-6 flex flex-col gap-4 border border-outline-variant/10 hover:border-primary/30`;
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="w-12 h-12 rounded-xl ${dc.bg} flex items-center justify-center">
                        <span class="material-symbols-outlined ${dc.text}" style="font-variation-settings: 'FILL' 1;">${sc.icon}</span>
                    </div>
                    <span class="px-2.5 py-1 rounded-full ${dc.bg} ${dc.text} ${dc.border} border text-[10px] font-black uppercase tracking-widest">${sc.difficulty}</span>
                </div>
                <div>
                    <h3 class="text-lg font-bold text-on-surface mb-1">${sc.name}</h3>
                    <p class="text-xs text-on-surface-variant leading-relaxed">${sc.description.slice(0, 100)}…</p>
                </div>
                <div class="flex items-center gap-3 pt-2 border-t border-outline-variant/10 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                    <span class="material-symbols-outlined text-[14px]">schedule</span>
                    ${sc.duration} · ${sc.dataPoints.length} ticks
                </div>
            `;
            card.addEventListener('click', () => startScenario(key));
            scenarioGrid.appendChild(card);
        });

        // Full Journey card
        const fullCard = document.createElement('div');
        fullCard.className = `scenario-card cursor-pointer rounded-2xl p-6 flex flex-col gap-4 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary-dim/5`;
        fullCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">all_inclusive</span>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest">Epic</span>
            </div>
            <div>
                <h3 class="text-lg font-bold text-on-surface mb-1">Full Journey (2018–2021)</h3>
                <p class="text-xs text-on-surface-variant leading-relaxed">Experience sideways, crash, and recovery in one epic 4-year run…</p>
            </div>
            <div class="flex items-center gap-3 pt-2 border-t border-primary/10 text-[10px] text-primary uppercase tracking-widest font-bold">
                <span class="material-symbols-outlined text-[14px]">bolt</span>
                Recommended · All 3 scenarios
            </div>
        `;
        fullCard.addEventListener('click', () => startScenario('full-journey'));
        scenarioGrid.appendChild(fullCard);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // START SCENARIO
    // ═══════════════════════════════════════════════════════════════════════════
    function startScenario(scenarioKey) {
        // Build data points
        if (scenarioKey === 'full-journey') {
            const s = allScenarios['sideways'].dataPoints;
            const c = allScenarios['market-crash'].dataPoints;
            const b = allScenarios['bull-run'].dataPoints;
            // Sideways → Crash (skip overlapping Jan/Feb 2020) → Bull (from Jul 2020)
            dataPoints = [...s];
            const crashStart = c.findIndex(p => p.label.includes('Mar') || p.label.includes('Early Mar'));
            if (crashStart > -1) dataPoints = dataPoints.concat(c.slice(crashStart));
            const bullStart = b.findIndex(p => p.label === 'Jul 2020');
            if (bullStart > -1) dataPoints = dataPoints.concat(b.slice(bullStart));

            activeScenario = {
                id: 'full-journey',
                name: 'Full Market Journey (2018–2021)',
                description: 'Sideways grind → COVID crash → Historic recovery. The complete investor experience.',
                difficulty: 'epic',
                icon: 'all_inclusive',
                summary: { totalReturn: 60, maxDrawdown: -32, bestMonth: 19.1, worstMonth: -17.7, volatility: 'Mixed' }
            };
        } else {
            const sc = allScenarios[scenarioKey];
            if (!sc) return;
            dataPoints = [...sc.dataPoints];
            activeScenario = sc;
        }

        // Reset state
        currentTick    = 0;
        isPlaying      = false;
        speed          = 1;
        cash           = STARTING_CAPITAL * weights.cash;
        totalInvested  = STARTING_CAPITAL;
        peakValue      = STARTING_CAPITAL;
        maxDrawdownPct = 0;
        tradeLog       = [];
        anxietyScores  = [];

        // Allocate starting capital across assets
        const baseNifty = dataPoints[0].niftyValue;
        const equityAlloc = STARTING_CAPITAL * weights.equity;
        const goldAlloc   = STARTING_CAPITAL * weights.gold;
        const bondAlloc   = STARTING_CAPITAL * weights.bonds;

        shares    = equityAlloc / baseNifty;
        goldUnits = goldAlloc / getGoldPrice(baseNifty, baseNifty);
        bondUnits = bondAlloc / getBondPrice(0, dataPoints.length);

        // Set slider to the fear-quiz-derived starting anxiety
        anxietySlider.value = startAnxiety;
        anxietyLabel.textContent = startAnxiety;
        anxietyScores.push({ tick: 0, value: startAnxiety, label: dataPoints[0].label, trigger: 'session_start' });

        // Store scenario info 
        localStorage.setItem('sim_scenario', activeScenario.name);
        localStorage.setItem('sim_difficulty', activeScenario.difficulty);
        localStorage.setItem('sim_starting_value', STARTING_CAPITAL);
        localStorage.setItem('sim_portfolio_type', portfolioType);

        // Update UI
        setupUI();

        // Hide overlay, show sim
        scenarioOverlay.style.opacity = '0';
        scenarioOverlay.style.pointerEvents = 'none';
        setTimeout(() => scenarioOverlay.style.display = 'none', 400);
        simMain.classList.remove('opacity-30', 'pointer-events-none');
        simFooter.classList.remove('opacity-30');

        // Engine active
        enginePulse.classList.remove('bg-on-surface-variant');
        enginePulse.classList.add('bg-primary', 'animate-pulse');
        engineStatus.textContent = 'Simulation loaded';

        // Initial render
        updateUI(0);
        showToast(`${activeScenario.name} loaded — press play!`, 'success');
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP UI FOR SCENARIO
    // ═══════════════════════════════════════════════════════════════════════════
    function setupUI() {
        // Header
        scenarioTitle.textContent = activeScenario.name;
        scenarioDesc.textContent  = activeScenario.description;

        const badgeStyles = {
            easy:   'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30',
            medium: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30',
            hard:   'bg-error/10 text-error border-error/30',
            epic:   'bg-primary/10 text-primary border-primary/30'
        };
        const bs = badgeStyles[activeScenario.difficulty] || badgeStyles.medium;
        scenarioBadge.className = `px-3 py-1 rounded-full text-xs font-bold border tracking-widest uppercase ${bs}`;
        scenarioBadge.textContent = activeScenario.difficulty;
        scenarioBadge.classList.remove('hidden');

        // Timeline labels
        timelineStart.textContent = dataPoints[0].label;
        timelineEnd.textContent   = dataPoints[dataPoints.length - 1].label;

        // Reset chart
        chartLine.setAttribute('d', '');
        chartFill.setAttribute('d', '');
        [chartDot, chartVLine, chartNowBg, chartNowText].forEach(el => el.style.display = 'none');

        // Reset play button
        btnPlay.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">play_arrow</span>`;

        // Build milestone bar
        buildMilestoneBar();

        // Set insight
        const insights = scenarioInsights[activeScenario.id] || scenarioInsights['full-journey'];
        insightText.textContent = insights[0];
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // CHART COORDINATE SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════
    function getCoords(index, value) {
        const totalTicks = dataPoints.length - 1;
        const chartW = 900, offsetX = 50;
        const yTop = 50, yBottom = 350;

        // Compute min/max with padding
        let minV = Infinity, maxV = -Infinity;
        for (let i = 0; i <= Math.min(index + 5, totalTicks); i++) {
            minV = Math.min(minV, dataPoints[i].niftyValue);
            maxV = Math.max(maxV, dataPoints[i].niftyValue);
        }
        // Use global range for stable scaling
        for (const dp of dataPoints) {
            minV = Math.min(minV, dp.niftyValue);
            maxV = Math.max(maxV, dp.niftyValue);
        }
        minV *= 0.92; maxV *= 1.08;
        const range = maxV - minV || 1;

        const cx = offsetX + (index * (chartW / totalTicks));
        const cy = yBottom - (((value - minV) / range) * (yBottom - yTop));
        return { cx, cy };
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRESSIVE CHART DRAWING
    // ═══════════════════════════════════════════════════════════════════════════
    function drawChart(upToTick) {
        if (dataPoints.length === 0) return;

        const first = getCoords(0, dataPoints[0].niftyValue);
        let linePath = `M${first.cx.toFixed(1)},${first.cy.toFixed(1)}`;
        let fillPath = `M${first.cx.toFixed(1)},${first.cy.toFixed(1)}`;

        for (let i = 1; i <= upToTick; i++) {
            const c = getCoords(i, dataPoints[i].niftyValue);
            linePath += ` L${c.cx.toFixed(1)},${c.cy.toFixed(1)}`;
            fillPath += ` L${c.cx.toFixed(1)},${c.cy.toFixed(1)}`;
        }

        const last = getCoords(upToTick, dataPoints[upToTick].niftyValue);
        fillPath += ` L${last.cx.toFixed(1)},400 L${first.cx.toFixed(1)},400 Z`;

        chartLine.setAttribute('d', linePath);
        chartFill.setAttribute('d', fillPath);

        // Determine gradient based on P&L
        const pnl = computePortfolioValue(upToTick) - totalInvested;
        chartFill.setAttribute('fill', pnl >= 0 ? 'url(#gainGradient)' : 'url(#lossGradient)');
        chartLine.setAttribute('stroke', pnl >= 0 ? '#a3a6ff' : '#ff6e84');

        // Current position indicator
        chartDot.setAttribute('cx', last.cx.toFixed(1));
        chartDot.setAttribute('cy', last.cy.toFixed(1));
        chartDot.setAttribute('fill', pnl >= 0 ? '#a3a6ff' : '#ff6e84');
        chartDot.style.display = '';

        chartVLine.setAttribute('x1', last.cx.toFixed(1));
        chartVLine.setAttribute('x2', last.cx.toFixed(1));
        chartVLine.setAttribute('stroke', pnl >= 0 ? '#a3a6ff' : '#ff6e84');
        chartVLine.style.display = '';

        chartNowBg.setAttribute('x', (last.cx - 32).toFixed(1));
        chartNowBg.setAttribute('y', (last.cy - 38).toFixed(1));
        chartNowBg.style.display = '';

        chartNowText.setAttribute('x', last.cx.toFixed(1));
        chartNowText.setAttribute('y', (last.cy - 21).toFixed(1));
        chartNowText.style.display = '';
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // PORTFOLIO COMPUTATION
    // ═══════════════════════════════════════════════════════════════════════════
    function computePortfolioValue(tick) {
        const d = dataPoints[tick];
        const baseNifty = dataPoints[0].niftyValue;
        const equityVal = shares * d.niftyValue;
        const goldVal   = goldUnits * getGoldPrice(d.niftyValue, baseNifty);
        const bondVal   = bondUnits * getBondPrice(tick, dataPoints.length);
        return equityVal + goldVal + bondVal + cash;
    }

    function computeHoldings(tick) {
        const d = dataPoints[tick];
        const baseNifty = dataPoints[0].niftyValue;
        const equityVal = shares * d.niftyValue;
        const goldPrice = getGoldPrice(d.niftyValue, baseNifty);
        const goldVal   = goldUnits * goldPrice;
        const bondPrice = getBondPrice(tick, dataPoints.length);
        const bondVal   = bondUnits * bondPrice;

        return [
            {
                name: 'Equity (Nifty 50)',
                icon: d.change < -5 ? 'trending_down' : d.change > 5 ? 'trending_up' : 'show_chart',
                iconColor: d.change < 0 ? 'text-error' : 'text-primary',
                bgColor: d.change < 0 ? 'bg-error/10' : 'bg-primary/10',
                category: 'Equity Index',
                value: equityVal,
                changePct: ((d.niftyValue / baseNifty) - 1) * 100
            },
            {
                name: 'Gold',
                icon: 'diamond',
                iconColor: 'text-[#f59e0b]',
                bgColor: 'bg-[#f59e0b]/10',
                category: 'Commodity',
                value: goldVal,
                changePct: ((goldPrice / getGoldPrice(baseNifty, baseNifty)) - 1) * 100
            },
            {
                name: 'Bonds & FD',
                icon: 'savings',
                iconColor: 'text-on-surface-variant',
                bgColor: 'bg-surface-bright',
                category: 'Debt/Fixed',
                value: bondVal,
                changePct: ((bondPrice / getBondPrice(0, dataPoints.length)) - 1) * 100
            }
        ];
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE UI (called every tick)
    // ═══════════════════════════════════════════════════════════════════════════
    function updateUI(tick) {
        const d = dataPoints[tick];
        const portfolioValue = computePortfolioValue(tick);
        const pnl = portfolioValue - totalInvested;
        const pnlPct = (pnl / totalInvested) * 100;

        // Track peak and drawdown
        if (portfolioValue > peakValue) peakValue = portfolioValue;
        const currentDrawdown = ((portfolioValue - peakValue) / peakValue) * 100;
        if (currentDrawdown < maxDrawdownPct) maxDrawdownPct = currentDrawdown;

        // ── Stats ──
        statPortfolioVal.textContent = `₹${Math.round(portfolioValue).toLocaleString('en-IN')}`;

        const pnlSign = pnl >= 0 ? '+' : '';
        statPnl.textContent = `${pnlSign}₹${Math.round(pnl).toLocaleString('en-IN')} (${pnlSign}${pnlPct.toFixed(1)}%)`;
        statPnl.className = `text-2xl font-mono font-bold ${pnl >= 0 ? 'text-[#10b981]' : 'text-error-dim'}`;

        statDrawdown.textContent = `${maxDrawdownPct.toFixed(1)}%`;
        statDrawdown.className = `text-2xl font-mono font-bold ${maxDrawdownPct < -15 ? 'text-error' : maxDrawdownPct < -5 ? 'text-[#f59e0b]' : 'text-on-surface-variant'}`;

        // ── Month header ──
        monthCounter.textContent = `Month ${tick + 1} of ${dataPoints.length}`;
        monthLabel.textContent = d.label;

        // ── Holdings panel ──
        const holdings = computeHoldings(tick);
        holdingsList.innerHTML = '';
        holdings.forEach(h => {
            const changePctStr = `${h.changePct >= 0 ? '+' : ''}${h.changePct.toFixed(1)}%`;
            const changeColor = h.changePct >= 0 ? 'text-[#10b981]' : 'text-error-dim';
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant/10 transition-all';
            row.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${h.bgColor} flex items-center justify-center ${h.iconColor}">
                        <span class="material-symbols-outlined">${h.icon}</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold">${h.name}</p>
                        <p class="text-[10px] text-on-surface-variant">${h.category}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-mono font-bold">₹${Math.round(h.value).toLocaleString('en-IN')}</p>
                    <p class="text-[10px] font-mono ${changeColor}">${changePctStr}</p>
                </div>
            `;
            holdingsList.appendChild(row);
        });

        // Cash
        cashDisplay.textContent = `₹${Math.round(cash).toLocaleString('en-IN')}`;

        // ── Progress bar ──
        const progress = ((tick + 1) / dataPoints.length) * 100;
        progressBar.style.width = `${progress}%`;
        footerProgressText.textContent = `${Math.round(progress)}% Complete`;

        // ── Milestone bar ──
        updateMilestones(tick);

        // ── Chart ──
        drawChart(tick);

        // ── Auto-adjust anxiety based on market performance ──
        const currentChange = d.change || 0;
        if (currentChange < -10) {
            // Major crash — nudge anxiety up
            const newAnx = Math.min(10, parseInt(anxietySlider.value) + 1);
            anxietySlider.value = newAnx;
            anxietyLabel.textContent = newAnx;
            anxietyScores.push({ tick, value: newAnx, label: d.label, trigger: 'crash_auto' });
        } else if (currentChange > 10) {
            // Major rally — nudge anxiety down
            const newAnx = Math.max(1, parseInt(anxietySlider.value) - 1);
            anxietySlider.value = newAnx;
            anxietyLabel.textContent = newAnx;
            anxietyScores.push({ tick, value: newAnx, label: d.label, trigger: 'rally_auto' });
        }

        // ── Update insight at key moments ──
        if (tick > 0 && tick % Math.max(1, Math.floor(dataPoints.length / 3)) === 0) {
            const insights = scenarioInsights[activeScenario.id] || scenarioInsights['full-journey'];
            const idx = Math.floor(tick / Math.max(1, Math.floor(dataPoints.length / 3)));
            if (insights[idx]) insightText.textContent = insights[idx];
            // Log anxiety at milestones
            anxietyScores.push({ tick, value: parseInt(anxietySlider.value), label: d.label, trigger: 'milestone' });
        }
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // MILESTONES
    // ═══════════════════════════════════════════════════════════════════════════
    function buildMilestoneBar() {
        milestoneBar.innerHTML = '';
        const count = Math.min(6, dataPoints.length);
        const step = Math.floor(dataPoints.length / count);

        for (let i = 0; i < count; i++) {
            // Dot
            const dot = document.createElement('div');
            dot.className = 'milestone-dot w-3 h-3 rounded-full border-2 border-surface-container-highest bg-surface transition-all';
            dot.dataset.tick = i * step;
            milestoneBar.appendChild(dot);

            // Connector (except last)
            if (i < count - 1) {
                const conn = document.createElement('div');
                conn.className = 'milestone-conn flex-1 h-0.5 bg-surface-container-highest transition-all';
                conn.dataset.tick = i * step;
                milestoneBar.appendChild(conn);
            }
        }
    }

    function updateMilestones(tick) {
        const dots = milestoneBar.querySelectorAll('.milestone-dot');
        const conns = milestoneBar.querySelectorAll('.milestone-conn');

        dots.forEach(dot => {
            const dt = parseInt(dot.dataset.tick);
            if (tick >= dt) {
                dot.className = 'milestone-dot w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(163,166,255,0.5)] transition-all';
            } else {
                dot.className = 'milestone-dot w-3 h-3 rounded-full border-2 border-surface-container-highest bg-surface transition-all';
            }
        });

        conns && conns.forEach(conn => {
            const ct = parseInt(conn.dataset.tick);
            conn.className = tick >= ct
                ? 'milestone-conn flex-1 h-0.5 bg-primary transition-all'
                : 'milestone-conn flex-1 h-0.5 bg-surface-container-highest transition-all';
        });
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // PLAY / PAUSE
    // ═══════════════════════════════════════════════════════════════════════════
    btnPlay.addEventListener('click', () => {
        if (!activeScenario) {
            showToast('Select a scenario first!', 'warning');
            return;
        }

        isPlaying = !isPlaying;
        btnPlay.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${isPlaying ? 'pause' : 'play_arrow'}</span>`;

        if (isPlaying) {
            engineStatus.textContent = 'Simulation running…';
            runSimulation();
        } else {
            clearInterval(tickInterval);
            engineStatus.textContent = 'Simulation paused';
        }
    });

    function runSimulation() {
        clearInterval(tickInterval);
        const speeds = { 1: 1200, 2: 600, 5: 250, 10: 120 };
        const interval = speeds[speed] || 1200;

        tickInterval = setInterval(() => {
            if (currentTick >= dataPoints.length - 1) {
                endSimulation();
                return;
            }

            currentTick++;

            // Monthly SIP cash injection
            cash += MONTHLY_SIP;
            totalInvested += MONTHLY_SIP;

            updateUI(currentTick);
        }, interval);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // SPEED CONTROLS
    // ═══════════════════════════════════════════════════════════════════════════
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            speed = parseInt(btn.dataset.speed);

            // Update active styles
            speedBtns.forEach(b => {
                b.className = 'speed-btn text-[10px] font-mono px-2.5 py-1 rounded text-on-surface-variant hover:bg-surface-bright transition-all';
            });
            btn.className = 'speed-btn text-[10px] font-mono px-2.5 py-1 rounded bg-primary/20 text-primary speed-active transition-all';

            // If currently playing, restart interval with new speed
            if (isPlaying) runSimulation();

            showToast(`Speed set to ${speed}x`, 'info');
        });
    });


    // ═══════════════════════════════════════════════════════════════════════════
    // TRADE ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    btnBuy.addEventListener('click', () => {
        if (!activeScenario) { showToast('Start a simulation first', 'warning'); return; }
        if (cash < 100) {
            showToast('Not enough cash! Wait for next month\'s injection.', 'warning');
            return;
        }

        const price = dataPoints[currentTick].niftyValue;
        const sharesBought = cash / price;
        shares += sharesBought;
        tradeLog.push({ action: 'BUY', tick: currentTick, label: dataPoints[currentTick].label, amount: cash, shares: sharesBought, price });
        cash = 0;

        updateUI(currentTick);
        showToast(`Bought ₹${Math.round(sharesBought * price).toLocaleString('en-IN')} worth of equity`, 'success');
    });

    btnSell.addEventListener('click', () => {
        if (!activeScenario) { showToast('Start a simulation first', 'warning'); return; }
        if (shares <= 0.001) {
            showToast('No equity shares to sell!', 'error');
            return;
        }

        const price = dataPoints[currentTick].niftyValue;
        const proceeds = shares * price;
        tradeLog.push({ action: 'SELL', tick: currentTick, label: dataPoints[currentTick].label, amount: proceeds, shares, price });
        cash += proceeds;
        shares = 0;

        updateUI(currentTick);
        showToast(`Sold all equity for ₹${Math.round(proceeds).toLocaleString('en-IN')}`, 'error');
    });

    btnHold.addEventListener('click', () => {
        if (!activeScenario) { showToast('Start a simulation first', 'warning'); return; }

        tradeLog.push({ action: 'HOLD', tick: currentTick, label: dataPoints[currentTick].label });
        showToast('Holding steady — patience is a strategy 💎', 'info');
    });


    // ═══════════════════════════════════════════════════════════════════════════
    // ANXIETY SLIDER
    // ═══════════════════════════════════════════════════════════════════════════
    anxietySlider.addEventListener('input', () => {
        const val = anxietySlider.value;
        anxietyLabel.textContent = val;
        anxietyScores.push({ tick: currentTick, value: parseInt(val), label: dataPoints[currentTick]?.label || '' });
    });


    // ═══════════════════════════════════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════════════════════════════════
    btnReset.addEventListener('click', () => {
        if (!activeScenario) return;
        clearInterval(tickInterval);
        isPlaying = false;
        startScenario(activeScenario.id);
    });

    btnNewSim.addEventListener('click', () => {
        clearInterval(tickInterval);
        isPlaying = false;
        scenarioOverlay.style.display = 'flex';
        scenarioOverlay.style.opacity = '1';
        scenarioOverlay.style.pointerEvents = 'auto';
        simMain.classList.add('opacity-30', 'pointer-events-none');
        simFooter.classList.add('opacity-30');
    });


    // ═══════════════════════════════════════════════════════════════════════════
    // END SIMULATION
    // ═══════════════════════════════════════════════════════════════════════════
    function endSimulation() {
        clearInterval(tickInterval);
        isPlaying = false;
        btnPlay.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">check_circle</span>`;
        engineStatus.textContent = 'Simulation complete!';

        const finalValue = computePortfolioValue(currentTick);
        const totalReturn = ((finalValue - totalInvested) / totalInvested) * 100;
        const finalAnxiety = parseInt(anxietySlider.value) || 5;

        // Save comprehensive session data
        localStorage.setItem('sim_final_value', Math.round(finalValue));
        localStorage.setItem('sim_starting_value', totalInvested);
        localStorage.setItem('sim_max_drawdown', maxDrawdownPct.toFixed(1));
        localStorage.setItem('sim_total_return_pct', totalReturn.toFixed(1));
        localStorage.setItem('sim_trades', JSON.stringify(tradeLog));
        localStorage.setItem('sim_anxiety_start', startAnxiety);
        localStorage.setItem('sim_anxiety_end', finalAnxiety);
        localStorage.setItem('sim_anxiety_scores', JSON.stringify(anxietyScores));
        localStorage.setItem('sim_duration', dataPoints.length);
        localStorage.setItem('sim_scenario', activeScenario.name);
        localStorage.setItem('sim_difficulty', activeScenario.difficulty);
        localStorage.setItem('sim_portfolio_type', portfolioType);

        showToast('Simulation complete! Redirecting…', 'success');
        setTimeout(() => window.location.href = 'results.html', 2500);
    }

    // End Session button
    btnEndSession.addEventListener('click', () => {
        if (!activeScenario) { window.location.href = 'dashboard.html'; return; }
        endSimulation();
    });

    // Export Log
    btnExport.addEventListener('click', () => {
        if (tradeLog.length === 0) {
            showToast('No trades to export yet!', 'warning');
            return;
        }
        const logText = tradeLog.map(t => `[${t.label}] ${t.action} ${t.shares ? t.shares.toFixed(4) + ' shares' : ''} ${t.amount ? '₹' + Math.round(t.amount) : ''}`).join('\n');
        navigator.clipboard.writeText(logText).then(() => showToast('Trade log copied to clipboard!', 'success'));
    });

});
