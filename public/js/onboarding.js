document.addEventListener('DOMContentLoaded', () => {
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    const continueBtn = document.getElementById('continue-btn');
    
    let selectedPortfolio = 'balanced'; // Default to balanced

    portfolioCards.forEach(card => {
        card.addEventListener('click', () => {
            selectedPortfolio = card.getAttribute('data-portfolio');
            
            // Revert all cards to default style
            portfolioCards.forEach(c => {
                c.className = "portfolio-card cursor-pointer glass-card p-8 rounded-xl border border-outline-variant/15 flex flex-col hover:border-[#10B981]/50 transition-all group";
                
                // Clear any ring styles
                c.classList.remove('ring-4', 'ring-primary/20', 'bg-surface-container-high', 'border-primary/50');
                
                // Reapply specific hover border colors based on type
                if (c.getAttribute('data-portfolio') === 'conservative') c.classList.add('hover:border-[#10B981]/50');
                if (c.getAttribute('data-portfolio') === 'balanced') c.classList.add('hover:border-primary/50');
                if (c.getAttribute('data-portfolio') === 'aggressive') c.classList.add('hover:border-[#EF4444]/50');
            });
            
            // Apply selected style
            card.className = "portfolio-card cursor-pointer bg-surface-container-high p-8 rounded-xl border-2 flex flex-col h-full shadow-[0_20px_40px_rgba(15,0,164,0.15)] transform scale-[1.02] ring-4 ring-primary/20";
            
            if (selectedPortfolio === 'conservative') card.classList.add('border-[#10B981]');
            if (selectedPortfolio === 'balanced') card.classList.add('border-primary/50');
            if (selectedPortfolio === 'aggressive') card.classList.add('border-[#EF4444]');
        });
    });

    continueBtn.addEventListener('click', () => {
        // Save choice to localStorage and proceed to dashboard
        localStorage.setItem('fearless_portfolio', selectedPortfolio);
        window.location.href = 'dashboard.html';
    });
});
