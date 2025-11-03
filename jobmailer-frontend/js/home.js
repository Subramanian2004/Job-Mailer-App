// home.js
// --- 1. Authentication Check Logic ---
// This code block runs as soon as the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('userToken');

    if (token) {
        // Find all links that need to be changed.
        const authLinks = document.querySelectorAll('.auth-link');
        const navLoginLink = document.getElementById('nav-login-link');
        
        // --- USER IS LOGGED IN ---
        
        // Change links to point to the dashboard/app.
        authLinks.forEach(link => {
            link.href = './index.html'; // Point to the main app page.

            // Change the text for primary buttons.
            if (link.classList.contains('cta-button')) {
                link.textContent = 'Go to Dashboard';
            }
        });

        // Specifically change the navigation bar link text and style.
        if (navLoginLink) {
            navLoginLink.textContent = 'Dashboard';
        }
    }
    // If user is not logged in, no changes are needed, links remain as default.
});


// --- 2.Existing Animation and Effects Logic ---
// This will run correctly after the auth check.

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and steps
document.querySelectorAll('.feature-card, .step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});

// Add hover effect to floating cards
document.querySelectorAll('.floating-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.animationPlayState = 'paused';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.animationPlayState = 'running';
    });
});

// Counter animation for stats
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        // Handle both numbers and numbers with '+'
        let baseNumber = Math.floor(current);
        let suffix = element.innerHTML.includes('+') ? '+' : '';
        element.innerHTML = baseNumber + suffix;
    }, 30);
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver(function(entries, observerInstance) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const h3 = entry.target.querySelector('h3');
            if(h3 && !h3.animated) {
                h3.animated = true;
                const targetValue = parseInt(h3.textContent.replace('+', ''));
                if (!isNaN(targetValue)) {
                    animateCounter(h3, targetValue);
                }
                observerInstance.unobserve(entry.target); // Stop observing after animation starts
            }
        }
    });
}, { threshold: 0.8 });

document.querySelectorAll('.stat').forEach(statElement => {
    statsObserver.observe(statElement);
});
