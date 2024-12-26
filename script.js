// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Intersection Observer for Animations (Feature Cards)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = 1;
            entry.target.style.transform = 'translateY(0)';
        }
    });
});

document.querySelectorAll('.feature-card').forEach((card) => {
    card.style.opacity = 0;
    card.style.transform = 'translateY(20px)';
    observer.observe(card);
});

// Hamburger Menu Toggle for Mobile Navigation
const hamburger = document.querySelector('.hamburger-menu');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active'); // Toggle 'active' class to show/hide links
});

// Hero Section Animation on Page Load
const heroText = document.querySelector('.hero h1');
const heroButton = document.querySelector('.cta-button');

window.addEventListener('load', () => {
    heroText.style.transition = 'opacity 1s ease, transform 1s ease';
    heroText.style.opacity = 1;
    heroText.style.transform = 'translateY(0)';

    heroButton.style.transition = 'opacity 1s ease 0.5s, transform 1s ease 0.5s';
    heroButton.style.opacity = 1;
    heroButton.style.transform = 'translateY(0)';
});

// Lazy Loading Images
const lazyImages = document.querySelectorAll('img[data-src]');

const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src; // Load the actual image
            img.removeAttribute('data-src'); // Remove data-src attribute
            observer.unobserve(img); // Stop observing this image
        }
    });
});

lazyImages.forEach(img => lazyLoadObserver.observe(img));
