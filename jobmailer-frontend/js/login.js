// login.js

// API base URL - update this with your backend URL
const API_URL = 'http://localhost:3000/api';

// DOM elements
const loginBox = document.querySelector('.login-box');
const signupBox = document.querySelector('.signup-box');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');

// Toggle between login and signup
document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.style.display = 'none';
    signupBox.style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    signupBox.style.display = 'none';
    loginBox.style.display = 'block';
});

// Password toggle
document.getElementById('password-toggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store user data
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            }
            
            showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to templates page
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1500);
        } else {
            showToast(data.message || 'Invalid email or password', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
});

// Signup form submission
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully! Please login.', 'success');
            
            // Switch to login form
            setTimeout(() => {
                document.getElementById('show-login').click();
                document.getElementById('email').value = email;
            }, 1500);
        } else {
            showToast(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
});

// Google OAuth login
document.getElementById('google-login').addEventListener('click', () => {
    window.location.href = `${API_URL}/auth/google`;
});

// Check for remembered email
window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('remember-me').checked = true;
    }
    
    // Check if already logged in
    const token = localStorage.getItem('userToken');
    if (token) {
        verifyToken();
    }
});

// Verify token
async function verifyToken() {
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            window.location.href = './index.html';
        } else {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
        }
    } catch (error) {
        console.error('Token verification failed');
    }
}

// Utility functions
function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add this to the end of your existing login.js file

// Check for OAuth error messages in URL parameters
window.addEventListener('DOMContentLoaded', () => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('remember-me').checked = true;
    }
    
    // Check if already logged in
    const token = localStorage.getItem('userToken');
    if (token) {
        verifyToken();
    }
    
    // Check for OAuth errors
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
        let message = '';
        switch (error) {
            case 'auth_failed':
                message = 'Google authentication failed. Please try again.';
                break;
            case 'processing_failed':
                message = 'Error processing authentication data. Please try again.';
                break;
            case 'missing_data':
                message = 'Authentication data missing. Please try again.';
                break;
            default:
                message = 'Authentication error. Please try again.';
        }
        showToast(message, 'error');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// --- Verify JWT token with backend ---
async function verifyToken() {
  const token = localStorage.getItem('userToken');

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Token valid → go to dashboard
      window.location.href = './index.html';
    } else {
      // Token invalid → clear storage
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    }
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  }
}

// --- Simple toast popup ---
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

