// Login Page JavaScript
class LoginPage {
    constructor() {
        this.apiBaseUrl = '/api';
        this.form = document.getElementById('login-form');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Real-time validation
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Demo login buttons
        const demoButtons = document.querySelectorAll('.demo-login-btn');
        demoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.getAttribute('data-username');
                const password = e.target.getAttribute('data-password');
                this.fillDemoCredentials(username, password);
            });
        });

        // Forgot password
        const forgotLink = document.querySelector('.forgot-password');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showMessage('Password recovery feature coming soon! Please contact support.', 'info');
            });
        }
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'username':
                if (!value) {
                    errorMessage = 'Username or email is required';
                    isValid = false;
                }
                break;

            case 'password':
                if (!value) {
                    errorMessage = 'Password is required';
                    isValid = false;
                }
                break;
        }

        this.showFieldError(input, errorMessage, !isValid);
        return isValid;
    }

    showFieldError(input, message, hasError) {
        const errorElement = document.getElementById(input.name + '-error');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = hasError ? 'block' : 'none';
        }

        input.classList.toggle('error', hasError);
    }

    clearError(input) {
        this.showFieldError(input, '', false);
    }

    fillDemoCredentials(username, password) {
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        this.showMessage(`Demo credentials filled for ${username}. Click "Enter Academy" to login.`, 'info');
    }

    async handleLogin() {
        // Validate all fields
        const inputs = this.form.querySelectorAll('input[required]');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            return;
        }

        const formData = {
            username: document.getElementById('login-username').value.trim(),
            password: document.getElementById('login-password').value
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                // Store authentication data
                localStorage.setItem('gatekeeper_token', data.token);
                localStorage.setItem('gatekeeper_user', JSON.stringify(data.user));

                // Check remember me
                const rememberMe = document.getElementById('remember-me').checked;
                if (rememberMe) {
                    localStorage.setItem('gatekeeper_remember', 'true');
                }

                this.showMessage(data.message, 'success');
                
                // Redirect to dashboard after 1.5 seconds
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                this.showMessage(data.message, 'error');
            }

        } catch (error) {
            console.error('Login error:', error);
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
        const submitBtn = document.getElementById('login-btn');
        
        if (show) {
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Logging in...</span>';
        } else {
            spinner.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-key"></i> <span>Enter Academy</span>';
        }
    }
}

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
    
    // Check for URL parameters (messages from redirects)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('message')) {
        const login = new LoginPage();
        login.showMessage(urlParams.get('message'), urlParams.get('type') || 'info');
    }
});