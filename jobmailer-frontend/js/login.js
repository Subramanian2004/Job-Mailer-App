// login.js

// API base URL - update this with your backend URL
const API_URL = 'http://localhost:3000/api';

// DOM elements
const loginBox = document.querySelector('.login-box');
const signupBox = document.querySelector('.signup-box');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');

// Toggle between login and signup
document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.style.display = 'none';
    signupBox.style.display = 'block';
    clearAllErrors();
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    signupBox.style.display = 'none';
    loginBox.style.display = 'block';
    clearAllErrors();
});

// Password toggle for login form
document.getElementById('password-toggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Enhanced validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Updated password validation with strong requirements
function validatePassword(password) {
    const requirements = {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    requirements.isValid = requirements.length && requirements.uppercase && requirements.symbol;
    return requirements;
}

// Calculate password strength
function calculatePasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 6) strength += 1;
    if (password.length >= 10) strength += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
    
    // Determine strength level
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

// Update password requirements display (for signup form)
function updatePasswordRequirements(password) {
    const validation = validatePassword(password);
    
    // Update requirement indicators
    const lengthReq = document.getElementById('length-req');
    const uppercaseReq = document.getElementById('uppercase-req');
    const symbolReq = document.getElementById('symbol-req');
    
    if (lengthReq) {
        if (password) {
            lengthReq.classList.toggle('valid', validation.length);
            lengthReq.classList.toggle('invalid', !validation.length);
        } else {
            lengthReq.classList.remove('valid', 'invalid');
        }
    }
    
    if (uppercaseReq) {
        if (password) {
            uppercaseReq.classList.toggle('valid', validation.uppercase);
            uppercaseReq.classList.toggle('invalid', !validation.uppercase);
        } else {
            uppercaseReq.classList.remove('valid', 'invalid');
        }
    }
    
    if (symbolReq) {
        if (password) {
            symbolReq.classList.toggle('valid', validation.symbol);
            symbolReq.classList.toggle('invalid', !validation.symbol);
        } else {
            symbolReq.classList.remove('valid', 'invalid');
        }
    }
    
    // Update strength bar
    const strengthBar = document.getElementById('strength-bar');
    if (strengthBar) {
        if (password) {
            const strength = calculatePasswordStrength(password);
            strengthBar.className = `strength-bar ${strength}`;
        } else {
            strengthBar.className = 'strength-bar';
        }
    }
    
    return validation;
}

function validateName(name) {
    return name.trim().length >= 2;
}

// Show field error
function showFieldError(inputElement, message) {
    inputElement.classList.add('error');
    const errorText = inputElement.parentElement.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = message;
        errorText.classList.add('show');
    }
}

// Clear field error
function clearFieldError(inputElement) {
    inputElement.classList.remove('error');
    const errorText = inputElement.parentElement.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = '';
        errorText.classList.remove('show');
    }
}

// Clear all errors
function clearAllErrors() {
    document.querySelectorAll('.form-group input').forEach(input => {
        clearFieldError(input);
    });
}

// Real-time validation on input
document.getElementById('email').addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        showFieldError(this, "Please enter a valid email address");
        showToast("Please include an '@' in the email address", 'warning');
    } else {
        clearFieldError(this);
    }
});

document.getElementById('signup-email').addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
        showFieldError(this, "Please enter a valid email address");
        showToast("Email address must include '@' symbol", 'warning');
    } else {
        clearFieldError(this);
    }
});

document.getElementById('signup-name').addEventListener('blur', function() {
    if (this.value && !validateName(this.value)) {
        showFieldError(this, "Name must be at least 2 characters");
        showToast("Name is too short", 'warning');
    } else {
        clearFieldError(this);
    }
});

// Enhanced password validation with real-time feedback
document.getElementById('signup-password').addEventListener('input', function() {
    const validation = updatePasswordRequirements(this.value);
    
    // Show requirements div when typing
    const reqDiv = this.parentElement.querySelector('.password-requirements');
    if (reqDiv) {
        reqDiv.classList.add('show');
    }
    
    // Clear error if password is valid
    if (validation.isValid) {
        clearFieldError(this);
    }
});

document.getElementById('signup-password').addEventListener('blur', function() {
    if (this.value) {
        const validation = validatePassword(this.value);
        if (!validation.isValid) {
            let errorMsg = "Password must contain: ";
            const missing = [];
            if (!validation.length) missing.push("6+ characters");
            if (!validation.uppercase) missing.push("1 uppercase");
            if (!validation.symbol) missing.push("1 symbol");
            
            showFieldError(this, errorMsg + missing.join(", "));
            showToast("Password doesn't meet security requirements", 'warning');
        } else {
            clearFieldError(this);
        }
    }
});

// Add password toggle for signup form
document.getElementById('signup-password').addEventListener('focus', function() {
    // Add a toggle button for signup password if not exists
    if (!this.parentElement.querySelector('.password-toggle')) {
        const toggleBtn = document.createElement('i');
        toggleBtn.className = 'fas fa-eye password-toggle';
        toggleBtn.id = 'signup-password-toggle';
        toggleBtn.style.top = '40px';
        this.parentElement.appendChild(toggleBtn);
        
        toggleBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('signup-password');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
});

// Clear errors on input
document.querySelectorAll('.form-group input').forEach(input => {
    input.addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearFieldError(this);
        }
    });
});

// Login form submission with custom validation
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validate fields
    let isValid = true;
    
    if (!email) {
        showFieldError(document.getElementById('email'), "Email is required");
        showToast("Please enter your email address", 'error');
        isValid = false;
    } else if (!validateEmail(email)) {
        showFieldError(document.getElementById('email'), "Invalid email format");
        showToast("Please enter a valid email address", 'error');
        isValid = false;
    }
    
    if (!password) {
        showFieldError(document.getElementById('password'), "Password is required");
        showToast("Please enter your password", 'error');
        isValid = false;
    }
    
    if (!isValid) return;
    
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
            showFieldError(document.getElementById('password'), "Invalid credentials");
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
});

// Signup form submission with enhanced password validation
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    
    // Validate all fields
    let isValid = true;
    
    if (!name) {
        showFieldError(document.getElementById('signup-name'), "Name is required");
        showToast("Please enter your full name", 'error');
        isValid = false;
    } else if (!validateName(name)) {
        showFieldError(document.getElementById('signup-name'), "Name must be at least 2 characters");
        showToast("Name is too short", 'error');
        isValid = false;
    }
    
    if (!email) {
        showFieldError(document.getElementById('signup-email'), "Email is required");
        showToast("Please enter your email address", 'error');
        isValid = false;
    } else if (!validateEmail(email)) {
        showFieldError(document.getElementById('signup-email'), "Invalid email format");
        showToast("Please include an '@' in the email address", 'error');
        isValid = false;
    }
    
    // Enhanced password validation
    if (!password) {
        showFieldError(document.getElementById('signup-password'), "Password is required");
        showToast("Please create a password", 'error');
        isValid = false;
    } else {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            let errorMsg = "Password must contain: ";
            const missing = [];
            if (!passwordValidation.length) missing.push("at least 6 characters");
            if (!passwordValidation.uppercase) missing.push("one uppercase letter (A-Z)");
            if (!passwordValidation.symbol) missing.push("one special symbol (!@#$%^&*)");
            
            showFieldError(document.getElementById('signup-password'), errorMsg + missing.join(", "));
            showToast("Password doesn't meet security requirements", 'error');
            isValid = false;
        }
    }
    
    if (!isValid) return;
    
    showLoading();
    
    try {
        // First, create the account in your backend
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Send to n8n webhook for welcome email
            fetch('http://localhost:5678/webhook/mailmage-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: name, 
                    email: email 
                }),
            }).catch(err => console.log('Welcome email triggered'));
            
            showToast('Account created successfully! Check your email for a welcome message.', 'success');
            
            // Switch to login form
            setTimeout(() => {
                document.getElementById('show-login').click();
                document.getElementById('email').value = email;
            }, 1500);
        } else {
            if (data.message && data.message.includes('already exists')) {
                showFieldError(document.getElementById('signup-email'), "Email already registered");
                showToast('This email is already registered. Please sign in.', 'error');
            } else {
                showToast(data.message || 'Signup failed', 'error');
            }
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
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

// Enhanced toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${message}
        <div class="toast-progress"></div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// Forgot password handler
document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Password reset feature coming soon!', 'info');
});
