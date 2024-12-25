// script.js (Complete)
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    createTimeline();
    handleScroll();
    initializeMobileMenu();
});

function initializeAnimations() {
    const elements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    elements.forEach(element => observer.observe(element));
}

function createTimeline() {
    const timelineData = [
        {
            year: 2024,
            title: 'Launch of OculAI',
            description: 'Foundation establishment and initial AI model development'
        },
        {
            year: 2025,
            title: 'Clinical Trials Begin',
            description: 'First partnerships with research institutions'
        },
        {
            year: 2026,
            title: 'FDA Approval',
            description: 'First AI-powered diagnostic tool approved'
        },
        {
            year: 2027,
            title: 'Global Integration',
            description: 'Integration with major health record systems'
        },
        {
            year: 2028,
            title: 'Mobile
