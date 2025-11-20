// Dashboard Page JavaScript
class DashboardPage {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.authToken = null;
        this.checkAuthentication();
        this.setupEventListeners();
    }

    checkAuthentication() {
        // Check if user is logged in
        const savedToken = localStorage.getItem('gatekeeper_token');
        const savedUser = localStorage.getItem('gatekeeper_user');

        if (!savedToken || !savedUser) {
            // Redirect to login if not authenticated
            window.location.href = '/login?message=Please login to access your dashboard.&type=info';
            return;
        }

        this.authToken = savedToken;
        this.currentUser = JSON.parse(savedUser);
        this.updateUI();
        this.loadDashboardData();
    }

    setupEventListeners() {
        // Update login time
        this.updateLoginTime();
        
        // Refresh dashboard data every 30 seconds
        setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update user information
        document.getElementById('user-name').textContent = `Welcome, ${this.currentUser.fullName}!`;
        document.getElementById('user-id').textContent = `Student ID: ${this.currentUser.studentId}`;
        document.getElementById('user-email').textContent = `Email: ${this.currentUser.email}`;

        // Update welcome message with personalized greeting
        const welcomeText = document.getElementById('welcome-text');
        const greeting = this.getTimeBasedGreeting();
        welcomeText.textContent = `${greeting}, ${this.currentUser.fullName}! You have successfully passed through the Gatekeeper. Your learning journey continues!`;

        // Add user-specific activity
        this.addWelcomeActivity();
    }

    getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    }

    updateLoginTime() {
        const loginTimeElement = document.getElementById('login-time');
        if (loginTimeElement) {
            loginTimeElement.textContent = 'Just now';
        }
    }

    addWelcomeActivity() {
        const activityList = document.getElementById('activity-list');
        const greeting = this.getTimeBasedGreeting();
        
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.innerHTML = `
            <i class="fas fa-user-check"></i>
            <div class="activity-details">
                <h4>${greeting}, ${this.currentUser.fullName}!</h4>
                <p>Successfully authenticated and dashboard loaded</p>
                <span class="activity-time">Just now</span>
            </div>
        `;
        
        activityList.appendChild(newActivity);
    }

    async loadDashboardData() {
        if (!this.authToken) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const data = await response.json();

            if (data.success && data.stats) {
                // Update dashboard statistics
                document.getElementById('member-since').textContent = data.stats.memberSince;
                document.getElementById('total-students').textContent = data.stats.totalStudents;
            } else if (response.status === 401) {
                // Token expired, redirect to login
                this.logout();
            }

        } catch (error) {
            console.error('Dashboard data error:', error);
            this.showMessage('Error loading dashboard data', 'error');
        }
    }

    logout() {
        // Clear authentication data
        localStorage.removeItem('gatekeeper_token');
        localStorage.removeItem('gatekeeper_user');
        localStorage.removeItem('gatekeeper_remember');

        // Redirect to home with logout message
        window.location.href = '/?message=You have been logged out successfully. Thank you for visiting Code Academy!&type=info';
    }

    viewProfile() {
        if (this.currentUser) {
            this.showMessage(`Profile: ${this.currentUser.fullName} (${this.currentUser.studentId}) - ${this.currentUser.email}`, 'info');
        }
    }

    startCourse() {
        this.showMessage('🚀 Course feature coming soon! Start learning with Code Academy advanced modules.', 'info');
        
        // Add activity
        this.addActivity('fas fa-play', 'Explored course options', 'Ready to start learning journey');
    }

    viewCourses() {
        this.showMessage('📚 Course catalog feature coming soon! Browse our extensive programming courses.', 'info');
        
        // Add activity
        this.addActivity('fas fa-book', 'Browsed course catalog', 'Exploring available learning paths');
    }

    viewProgress() {
        this.showMessage('📊 Progress tracking feature coming soon! Monitor your learning achievements.', 'info');
        
        // Add activity
        this.addActivity('fas fa-chart-line', 'Checked learning progress', 'Reviewing completed milestones');
    }

    addActivity(icon, title, description) {
        const activityList = document.getElementById('activity-list');
        
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.innerHTML = `
            <i class="${icon}"></i>
            <div class="activity-details">
                <h4>${title}</h4>
                <p>${description}</p>
                <span class="activity-time">Just now</span>
            </div>
        `;
        
        // Add to top of list
        activityList.insertBefore(newActivity, activityList.firstChild);
        
        // Limit to 5 activities
        const activities = activityList.querySelectorAll('.activity-item');
        if (activities.length > 5) {
            activities[activities.length - 1].remove();
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
}

// Global functions for onclick handlers
function logout() {
    if (window.dashboardPage) {
        window.dashboardPage.logout();
    }
}

function viewProfile() {
    if (window.dashboardPage) {
        window.dashboardPage.viewProfile();
    }
}

function startCourse() {
    if (window.dashboardPage) {
        window.dashboardPage.startCourse();
    }
}

function viewCourses() {
    if (window.dashboardPage) {
        window.dashboardPage.viewCourses();
    }
}

function viewProgress() {
    if (window.dashboardPage) {
        window.dashboardPage.viewProgress();
    }
}

// Initialize dashboard page
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardPage = new DashboardPage();
});