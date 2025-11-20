// Signup Page JavaScript
class SignupPage {
    constructor() {
        this.apiBaseUrl = '/api';
        this.form = document.getElementById('signup-form');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Real-time validation
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Password confirmation
        const confirmPassword = document.getElementById('confirm-password');
        const password = document.getElementById('signup-password');
        
        confirmPassword.addEventListener('input', () => {
            this.validatePasswordMatch(password.value, confirmPassword.value);
        });
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'fullName':
                if (!value) {
                    errorMessage = 'Full name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Full name must be at least 2 characters';
                    isValid = false;
                }
                break;

            case 'username':
                if (!value) {
                    errorMessage = 'Username is required';
                    isValid = false;
                } else if (value.length < 3) {
                    errorMessage = 'Username must be at least 3 characters';
                    isValid = false;
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    errorMessage = 'Username can only contain letters, numbers, and underscores';
                    isValid = false;
                }
                break;

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value) {
                    errorMessage = 'Email is required';
                    isValid = false;
                } else if (!emailRegex.test(value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                }
                break;

            case 'password':
                if (!value) {
                    errorMessage = 'Password is required';
                    isValid = false;
                } else if (value.length < 6) {
                    errorMessage = 'Password must be at least 6 characters';
                    isValid = false;
                }
                break;
        }

        this.showFieldError(input, errorMessage, !isValid);
        return isValid;
    }

    validatePasswordMatch(password, confirmPassword) {
        const confirmInput = document.getElementById('confirm-password');
        if (confirmPassword && password !== confirmPassword) {
            this.showFieldError(confirmInput, 'Passwords do not match', true);
            return false;
        } else {
            this.showFieldError(confirmInput, '', false);
            return true;
        }
    }

    showFieldError(input, message, hasError) {
        const errorElement = document.getElementById(input.name + '-error') || 
                           document.getElementById(input.id + '-error');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = hasError ? 'block' : 'none';
        }

        input.classList.toggle('error', hasError);
    }

    clearError(input) {
        this.showFieldError(input, '', false);
    }

    async handleSignup() {
        // Validate all fields
        const inputs = this.form.querySelectorAll('input[required]');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isFormValid = false;
            }
        });

        // Check password match
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (!this.validatePasswordMatch(password, confirmPassword)) {
            isFormValid = false;
        }

        // Check terms checkbox
        const termsCheckbox = document.getElementById('terms-checkbox');
        if (!termsCheckbox.checked) {
            this.showMessage('Please accept the Terms of Service and Privacy Policy', 'error');
            isFormValid = false;
        }

        if (!isFormValid) {
            return;
        }

        const formData = {
            fullName: document.getElementById('signup-fullname').value.trim(),
            username: document.getElementById('signup-username').value.trim(),
            email: document.getElementById('signup-email').value.trim(),
            password: document.getElementById('signup-password').value
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.form.reset();
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login?message=Account created successfully! Please login with your credentials.&type=success';
                }, 2000);
            } else {
                this.showMessage(data.message, 'error');
            }

        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('message-container');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        messageElement.innerHTML = `
            <i class="${iconMap[type]}"></i>
            <span>${message}</span>
        `;

        messageContainer.appendChild(messageElement);

        // Auto-remove message after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 5000);
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        const submitBtn = document.getElementById('signup-btn');
        
        if (show) {
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating Account...</span>';
        } else {
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i> <span>Create Account</span>';
        }
    }
}

// Initialize signup page
document.addEventListener('DOMContentLoaded', () => {
    new SignupPage();
    
    // Check for URL parameters (messages from redirects)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('message')) {
        const signup = new SignupPage();
        signup.showMessage(urlParams.get('message'), urlParams.get('type') || 'info');
    }
});