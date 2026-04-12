document.addEventListener('DOMContentLoaded', () => {
    const gaugeNeedle = document.getElementById('gauge-needle');
    const gaugeReadout = document.getElementById('gauge-readout');
    const assetNameText = document.getElementById('asset-name-text');
    const horizonText = document.getElementById('horizon-text');
    const assetProbText = document.getElementById('asset-prob-text');
    const comparisonText = document.getElementById('comparison-text');
    const horizonButtons = document.querySelectorAll('.horizon-btn');
    const assetCards = document.querySelectorAll('.asset-card');

    let probabilityData = null;
    let currentAsset = 'nifty50';
    let currentHorizon = '5years';

    // Readable mapping
    const horizonLabels = {
        '1month': '1 month',
        '3months': '3 months',
        '6months': '6 months',
        '1year': '1 year',
        '3years': '3 years',
        '5years': '5 years',
        '10years': '10 years',
        '15years': '15 years',
        '20years': '20 years'
    };

    fetch('/public/data/loss-probability.json')
        .then(res => res.json())
        .then(data => {
            probabilityData = data;
            
            // Attach event listeners to horizon buttons
            horizonButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    currentHorizon = e.target.getAttribute('data-horizon');
                    updateUI();
                });
            });

            // Attach event listeners to asset cards
            assetCards.forEach(card => {
                card.addEventListener('click', (e) => {
                    currentAsset = e.currentTarget.getAttribute('data-asset');
                    updateUI();
                });
            });

            updateUI(); // Initial render
        })
        .catch(err => console.error("Failed to load probability data:", err));

    function findClosestComparison(probability) {
        if (!probabilityData || !probabilityData.relatableComparisons) return '';
        let comparisons = probabilityData.relatableComparisons;
        let closest = comparisons[0];
        let minDiff = Math.abs(probability - closest.probability);

        for (let i = 1; i < comparisons.length; i++) {
            let diff = Math.abs(probability - comparisons[i].probability);
            if (diff < minDiff) {
                minDiff = diff;
                closest = comparisons[i];
            }
        }
        return `That's similar to ${closest.comparison}!`;
    }

    function updateUI() {
        if (!probabilityData) return;

        const asset = probabilityData.assetClasses[currentAsset];
        const probability = asset.lossProbability[currentHorizon];

        // Update texts
        assetNameText.innerText = asset.name;
        horizonText.innerText = horizonLabels[currentHorizon];
        assetProbText.innerText = `Only ${probability}%`;
        
        // Gauge rotation: Map 0% to -90deg, 100% to +90deg
        const rotation = -90 + (probability / 100) * 180;
        gaugeNeedle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        
        // Animated percentage counter
        let start = parseInt(gaugeReadout.innerText) || 0;
        let end = probability;
        let duration = 500;
        let startTime = null;
        
        const animateValue = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            gaugeReadout.innerText = Math.floor(progress * (end - start) + start) + '%';
            if (progress < 1) {
                window.requestAnimationFrame(animateValue);
            } else {
                gaugeReadout.innerText = end + '%';
            }
        };
        window.requestAnimationFrame(animateValue);

        comparisonText.innerText = findClosestComparison(probability);

        // Update button states
        horizonButtons.forEach(btn => {
            if (btn.getAttribute('data-horizon') === currentHorizon) {
                btn.className = "horizon-btn px-4 py-1.5 bg-primary text-on-primary rounded-full text-xs font-black shadow-lg shadow-primary/20 transition-all";
            } else {
                btn.className = "horizon-btn text-xs font-bold text-on-surface-variant/60 hover:text-on-surface transition-colors";
            }
        });

        // Update asset card active states
        assetCards.forEach(card => {
            if (card.getAttribute('data-asset') === currentAsset) {
                card.className = "asset-card cursor-pointer bg-primary/10 p-6 rounded-2xl ring-2 ring-primary ring-offset-4 ring-offset-surface relative overflow-hidden transition-all group shadow-2xl shadow-primary/10";
            } else {
                card.className = "asset-card cursor-pointer glass-panel p-6 rounded-2xl border-transparent hover:border-outline-variant/20 transition-all group";
            }
            
            // Update individual stat
            const cardAsset = probabilityData.assetClasses[card.getAttribute('data-asset')];
            const p = cardAsset.lossProbability[currentHorizon];
            const probSpan = card.querySelector('.text-xl.font-black');
            if (probSpan) probSpan.innerText = `${p}%`;
            
            // Update inner bar
            const innerBar = card.querySelector('.group-hover\\:h-\\[10\\%\\], .h-\\[2\\%\\], .h-\\[6\\%\\], .h-\\[8\\%\\], .h-\\[10\\%\\], .h-\\[18\\%\\]');
            if (innerBar) {
                innerBar.style.height = `${Math.max(p, 2)}%`;
            }
        });
    }
});
