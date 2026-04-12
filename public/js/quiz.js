document.addEventListener('DOMContentLoaded', () => {
    const questionProgress = document.getElementById('question-progress');
    const progressBarInner = document.getElementById('progress-bar-inner');
    const questionText = document.getElementById('question-text');
    const optionsGrid = document.getElementById('options-grid');
    const nextBtn = document.getElementById('next-btn');

    let questions = [];
    let currentIndex = 0;
    let selectedScore = null;
    let cumulativeFearScore = 0;

    const optionColors = [
        'border-[#10B981]', // Green
        'border-[#3B82F6]', // Blue
        'border-[#F59E0B]', // Amber
        'border-[#EF4444]'  // Red
    ];

    fetch('/public/data/fear-quiz.json')
        .then(res => res.json())
        .then(data => {
            questions = data;
            renderQuestion();
        })
        .catch(err => console.error("Failed to load quiz data:", err));

    function renderQuestion() {
        if (currentIndex >= questions.length) {
            // Finish quiz
            localStorage.setItem('fearless_fear_score', cumulativeFearScore);
            window.location.href = 'onboarding.html';
            return;
        }

        const q = questions[currentIndex];
        
        // Update headers
        questionProgress.innerText = `Question ${currentIndex + 1} of ${questions.length}`;
        progressBarInner.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
        questionText.innerText = q.question;

        // Clear and rebuild options
        optionsGrid.innerHTML = '';
        selectedScore = null;
        updateNextButtonState();

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            const colorClass = optionColors[idx % optionColors.length];
            
            btn.className = `w-full text-left group flex items-center p-5 rounded-lg bg-surface-container-low hover:bg-surface-variant border-l-4 ${colorClass} transition-all duration-200 hover:translate-x-1`;
            
            btn.innerHTML = `
                <div class="flex-1">
                    <p class="text-on-surface font-semibold group-hover:text-primary transition-colors">${opt.text}</p>
                </div>
                <span class="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
            `;

            btn.addEventListener('click', () => {
                // Remove active state from all
                [...optionsGrid.children].forEach(c => {
                    c.classList.remove('ring-2', 'ring-primary', 'bg-surface-variant');
                });
                
                // Set active state
                btn.classList.add('ring-2', 'ring-primary', 'bg-surface-variant');
                selectedScore = opt.score;
                updateNextButtonState();
            });

            optionsGrid.appendChild(btn);
        });
    }

    function updateNextButtonState() {
        if (selectedScore !== null) {
            nextBtn.disabled = false;
            nextBtn.className = "w-full py-4 px-8 rounded-full bg-gradient-to-r from-primary to-secondary-dim text-on-primary font-bold text-lg shadow-[0_0_20px_rgba(96,99,238,0.4)] hover:shadow-[0_0_30px_rgba(96,99,238,0.6)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer";
        } else {
            nextBtn.disabled = true;
            nextBtn.className = "w-full py-4 px-8 rounded-full bg-surface-container-highest text-on-surface-variant font-bold text-lg cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2";
        }
    }

    nextBtn.addEventListener('click', () => {
        if (selectedScore !== null) {
            cumulativeFearScore += selectedScore;
            currentIndex++;
            renderQuestion();
        }
    });
});
