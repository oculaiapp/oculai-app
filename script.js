// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animations
    initializeAnimations();
    
    // Create timeline
    createTimeline();
    
    // Handle scroll events
    handleScroll();
});

// Animation handler
function initializeAnimations() {
    const elements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    });
    
    elements.forEach(element => observer.observe(element));
}

// Timeline creator
function createTimeline() {
    const timelineData = [
        {
            year: 2024,
            title: 'Launch of OculAI',
            description: 'Foundation establishment and initial AI model development'
        },
        // Add more timeline items
    ];
    
    const timelineContainer = document.querySelector('.timeline-container');
    
    timelineData.forEach(item => {
        const timelineItem = createTimelineItem(item);
        timelineContainer.appendChild(timelineItem);
    });
}

// Smooth scroll handler
function handleScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}
