document.addEventListener('DOMContentLoaded', () => {
    const portfolioName = document.getElementById('portfolio-name');
    const riskScoreVal = document.getElementById('risk-score-val');
    const riskScoreLabel = document.getElementById('risk-score-label');
    const portfolioAllocations = document.getElementById('portfolio-allocations');
    const fearScoreText = document.getElementById('fear-score-text');
    const fearScoreBar = document.getElementById('fear-score-bar');

    let selectedPortfolioId = localStorage.getItem('fearless_portfolio') || 'balanced';
    let fearScore = localStorage.getItem('fearless_fear_score');

    // Render Fear Score
    if (fearScore) {
        // Max possible from 3 questions is 12
        const percentage = (parseInt(fearScore) / 12) * 100;
        fearScoreText.innerText = `${fearScore} / 12`;
        fearScoreBar.style.width = `${percentage}%`;
    } else {
        fearScoreText.innerText = "Quiz not taken";
        fearScoreBar.style.width = "0%";
    }

    // Fetch and Render Portfolio
    fetch('/public/data/portfolios.json')
        .then(res => res.json())
        .then(data => {
            const portfolio = data[selectedPortfolioId];
            if (!portfolio) return;

            // Update Header
            portfolioName.innerText = portfolio.name;
            
            // Update Risk Score Block
            riskScoreVal.innerText = `${portfolio.riskScore}/100`;
            if (portfolio.riskScore < 40) riskScoreLabel.innerText = "Low Risk";
            else if (portfolio.riskScore < 70) riskScoreLabel.innerText = "Moderate Risk";
            else riskScoreLabel.innerText = "High Risk";

            // Update Allocations Grid
            portfolioAllocations.innerHTML = '';
            portfolio.allocation.forEach(alloc => {
                const item = document.createElement('div');
                item.className = "p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors";
                item.innerHTML = `
                    <div class="flex items-center gap-2 mb-1">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${alloc.color}"></div>
                        <p class="text-xs text-on-surface-variant font-bold truncate">${alloc.asset}</p>
                    </div>
                    <p class="text-lg font-bold pl-4">${alloc.percentage}%</p>
                `;
                portfolioAllocations.appendChild(item);
            });
            
        })
        .catch(err => console.error("Failed to load portfolio data:", err));
});
