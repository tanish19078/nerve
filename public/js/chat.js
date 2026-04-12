document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatThread = document.getElementById('chat-thread');
    const eli5Toggle = document.getElementById('eli5-toggle');

    if (!chatInput || !sendButton || !chatThread) {
        console.error('Chat elements not found.');
        return;
    }

    let isEli5Mode = false;
    let chatHistory = [];

    // Optional: Load user's portfolio from localStorage or global state
    const userPortfolio = JSON.parse(localStorage.getItem('fearless_portfolio') || 'null');

    if (eli5Toggle) {
        eli5Toggle.addEventListener('click', () => {
            isEli5Mode = !isEli5Mode;
            eli5Toggle.classList.toggle('bg-primary');
            eli5Toggle.classList.toggle('bg-primary-container');
            const handle = eli5Toggle.querySelector('span');
            handle.classList.toggle('translate-x-6');
            handle.classList.toggle('translate-x-1');
        });
    }

    const appendMessage = (text, sender = 'user') => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex gap-4 max-w-2xl ${sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`;
        
        let iconHtml = '';
        let contentClass = '';

        if (sender === 'user') {
            iconHtml = `<div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-primary text-sm">person</span>
                        </div>`;
            contentClass = 'bg-primary/10 p-4 rounded-2xl rounded-tr-none border border-primary/20 text-on-surface text-sm leading-relaxed';
        } else {
            iconHtml = `<div class="w-8 h-8 rounded-full bg-secondary-dim/20 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-secondary text-sm" data-weight="fill">smart_toy</span>
                        </div>`;
            contentClass = 'glass-card p-4 rounded-2xl rounded-tl-none border border-outline-variant/10 text-on-surface text-sm leading-relaxed whitespace-pre-wrap';
        }

        msgDiv.innerHTML = `
            ${iconHtml}
            <div class="${contentClass}">
                ${text}
            </div>
        `;
        
        chatThread.appendChild(msgDiv);
        chatThread.scrollTop = chatThread.scrollHeight;
    };

    const addTypingIndicator = () => {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex gap-4 max-w-2xl';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-secondary-dim/20 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-secondary text-sm" data-weight="fill">smart_toy</span>
            </div>
            <div class="glass-card p-4 rounded-2xl rounded-tl-none border border-outline-variant/10 text-on-surface text-sm leading-relaxed flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce"></span>
                <span class="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style="animation-delay: 0.1s"></span>
                <span class="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style="animation-delay: 0.2s"></span>
            </div>
        `;
        chatThread.appendChild(typingDiv);
        chatThread.scrollTop = chatThread.scrollHeight;
    };

    const removeTypingIndicator = () => {
        const ind = document.getElementById('typing-indicator');
        if (ind) ind.remove();
    };

    const handleSend = async () => {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';
        chatHistory.push({ role: 'user', content: text });

        addTypingIndicator();

        try {
            const res = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    mode: isEli5Mode ? 'eli5' : 'normal',
                    portfolio: userPortfolio,
                    history: chatHistory
                })
            });

            removeTypingIndicator();

            if (res.ok) {
                const data = await res.json();
                appendMessage(data.explanation, 'ai');
                chatHistory.push({ role: 'assistant', content: data.explanation });
            } else {
                appendMessage("I'm sorry, I encountered an error connecting to the backend. Please try again.", 'ai');
            }
        } catch (error) {
            removeTypingIndicator();
            appendMessage("I'm having trouble reaching my servers right now.", 'ai');
            console.error('Error fetching AI explanation:', error);
        }
    };

    sendButton.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    // Wire up prompt starters
    const starters = document.querySelectorAll('.prompt-starter');
    starters.forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.innerText.replace('north_east', '').trim();
            handleSend();
        });
    });
});
