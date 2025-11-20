// Students Page JavaScript
class StudentsPage {
    constructor() {
        this.apiBaseUrl = '/api';
        this.authToken = null;
        this.students = [];
        this.filteredStudents = [];
        this.checkAuthentication();
        this.setupEventListeners();
    }

    checkAuthentication() {
        // Check if user is logged in
        const savedToken = localStorage.getItem('gatekeeper_token');
        
        if (!savedToken) {
            // Redirect to login if not authenticated
            window.location.href = '/login?message=Please login to access the students directory.&type=info';
            return;
        }

        this.authToken = savedToken;
        this.loadStudentsList();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterStudents(e.target.value);
            });
        }
    }

    async loadStudentsList() {
        if (!this.authToken) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/students`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.students = data.students;
                this.filteredStudents = [...this.students];
                this.stats = data.stats;
                this.displayStudentsList(this.filteredStudents);
                this.updateStats();
            } else if (response.status === 401) {
                // Token expired, redirect to login
                this.logout();
            } else {
                this.showMessage('Failed to load students list', 'error');
                this.showEmptyState('Failed to load students');
            }

        } catch (error) {
            console.error('Students list error:', error);
            this.showMessage('Network error while loading students', 'error');
            this.showEmptyState('Network error occurred');
        } finally {
            this.showLoading(false);
        }
    }

    displayStudentsList(students) {
        const studentsListContainer = document.getElementById('students-list');
        
        if (students.length === 0) {
            this.showEmptyState('No students found');
            return;
        }

        const studentsHTML = students.map(student => `
            <div class="student-item" data-student-id="${student.id}">
                <div class="student-header">
                    <div class="student-avatar">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="student-main-info">
                        <h4>${student.fullName}</h4>
                        <p class="student-id">ID: ${student.id}</p>
                    </div>
                    <div class="student-status">
                        <span class="status-badge active">Active</span>
                    </div>
                </div>
                <div class="student-details">
                    <div class="detail-item">
                        <i class="fas fa-user"></i>
                        <span>Username: <strong>${student.username}</strong></span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <span>Email: <strong>${student.email}</strong></span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Joined: <strong>${this.formatDate(student.joinDate)}</strong></span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="action-btn" onclick="window.studentsPage.viewStudentProfile('${student.id}')">
                        <i class="fas fa-eye"></i> View Profile
                    </button>
                    <button class="action-btn" onclick="window.studentsPage.sendMessage('${student.id}')">
                        <i class="fas fa-envelope"></i> Message
                    </button>
                </div>
            </div>
        `).join('');

        studentsListContainer.innerHTML = studentsHTML;
    }

    showEmptyState(message) {
        const studentsListContainer = document.getElementById('students-list');
        studentsListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>${message}</h3>
                <p>No students to display at this time.</p>
                <button class="refresh-btn" onclick="window.studentsPage.loadStudentsList()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }

    filterStudents(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredStudents = [...this.students];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredStudents = this.students.filter(student =>
                student.fullName.toLowerCase().includes(term) ||
                student.username.toLowerCase().includes(term) ||
                student.email.toLowerCase().includes(term) ||
                student.studentId.toLowerCase().includes(term)
            );
        }
        
        this.displayStudentsList(this.filteredStudents);
        this.updateStats();
    }

    updateStats() {
        document.getElementById('total-count').textContent = this.students.length;
        
        // Calculate new students this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = this.students.filter(student => {
            const joinDate = new Date(student.registrationDate);
            return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
        }).length;
        
        document.getElementById('new-count').textContent = newThisMonth;
        document.getElementById('active-count').textContent = this.students.length; // All students are active for now
    }

    viewStudentProfile(studentId) {
        const student = this.students.find(s => s.id == studentId);
        if (student) {
            this.showMessage(`Profile: ${student.fullName} (${student.studentId}) - Member since ${this.formatDate(student.registrationDate)}`, 'info');
        }
    }

    sendMessage(studentId) {
        const student = this.students.find(s => s.id == studentId);
        if (student) {
            this.showMessage(`Messaging feature coming soon! You can contact ${student.fullName} at ${student.email}`, 'info');
        }
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    logout() {
        // Clear authentication data
        localStorage.removeItem('gatekeeper_token');
        localStorage.removeItem('gatekeeper_user');
        localStorage.removeItem('gatekeeper_remember');

        // Redirect to home with logout message
        window.location.href = '/?message=Session expired. Please login again.&type=info';
    }

    showLoading(show) {
        const studentsListContainer = document.getElementById('students-list');
        
        if (show) {
            studentsListContainer.innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading students...</p>
                </div>
            `;
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
    if (window.studentsPage) {
        window.studentsPage.logout();
    }
}

function loadStudentsList() {
    if (window.studentsPage) {
        window.studentsPage.loadStudentsList();
    }
}

// Initialize students page
document.addEventListener('DOMContentLoaded', () => {
    window.studentsPage = new StudentsPage();
});