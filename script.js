document.addEventListener('DOMContentLoaded', () => {
    initializeAI();
    setupAnimations();
    create3DEye();
});

function initializeAI() {
    const aiAssistant = document.getElementById('aiAssistant');
    aiAssistant.addEventListener('click', () => {
        openAIChat();
    });
}

function create3DEye() {
    const canvas = document.getElementById('eyeCanvas');
    const ctx = canvas.getContext('2d');
}

function setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}
