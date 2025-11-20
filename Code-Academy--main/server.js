const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-here-make-it-strong-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve static files
app.use('/css', express.static(path.join(__dirname)));
app.use('/js', express.static(path.join(__dirname)));

// In-memory storage (in production, use a proper database)
let users = [];

// Load users from JSON file if it exists
const usersFilePath = path.join(__dirname, 'users.json');

function loadUsers() {
    try {
        if (fs.existsSync(usersFilePath)) {
            const data = fs.readFileSync(usersFilePath, 'utf8');
            users = JSON.parse(data);
            console.log(`Loaded ${users.length} users from users.json`);
        } else {
            // Create default demo users
            users = [
                {
                    id: 'STU001',
                    firstName: 'Demo',
                    lastName: 'Student',
                    email: 'demo@codeacademy.com',
                    password: bcrypt.hashSync('demo123', 10),
                    joinDate: new Date('2024-01-15').toISOString(),
                    course: 'Full Stack Development',
                    level: 'Intermediate',
                    progress: 75,
                    completedProjects: 8,
                    totalProjects: 12,
                    studyHours: 156,
                    certificates: ['HTML/CSS Basics', 'JavaScript Fundamentals'],
                    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
                    status: 'Active'
                },
                {
                    id: 'STU002',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane@codeacademy.com',
                    password: bcrypt.hashSync('jane123', 10),
                    joinDate: new Date('2024-02-01').toISOString(),
                    course: 'Data Science',
                    level: 'Advanced',
                    progress: 90,
                    completedProjects: 15,
                    totalProjects: 16,
                    studyHours: 280,
                    certificates: ['Python Basics', 'Data Analysis', 'Machine Learning'],
                    skills: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow'],
                    status: 'Active'
                },
                {
                    id: 'STU003',
                    firstName: 'Mike',
                    lastName: 'Johnson',
                    email: 'mike@codeacademy.com',
                    password: bcrypt.hashSync('mike123', 10),
                    joinDate: new Date('2024-03-10').toISOString(),
                    course: 'Mobile Development',
                    level: 'Beginner',
                    progress: 45,
                    completedProjects: 3,
                    totalProjects: 8,
                    studyHours: 67,
                    certificates: ['Mobile UI Design'],
                    skills: ['Flutter', 'Dart', 'UI/UX Design'],
                    status: 'Active'
                }
            ];
            saveUsers();
        }
    } catch (error) {
        console.error('Error loading users:', error);
        users = [];
    }
}

function saveUsers() {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Load users on startup
loadUsers();

// Helper function to generate user ID
function generateUserId() {
    const lastUser = users.reduce((prev, current) => {
        const prevNum = parseInt(prev.id.replace('STU', ''));
        const currentNum = parseInt(current.id.replace('STU', ''));
        return prevNum > currentNum ? prev : current;
    }, { id: 'STU000' });
    
    const nextNum = parseInt(lastUser.id.replace('STU', '')) + 1;
    return `STU${nextNum.toString().padStart(3, '0')}`;
}

// JWT middleware for protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Routes to serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/students', (req, res) => {
    res.sendFile(path.join(__dirname, 'students.html'));
});

// API Routes

// User Registration
app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;

        // Validation
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'All fields are required: fullName, username, email, password' 
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: 'Please enter a valid email address' 
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Username validation
        if (username.length < 3) {
            return res.status(400).json({ 
                success: false,
                message: 'Username must be at least 3 characters long' 
            });
        }

        // Check if user already exists (by email or username)
        const existingUser = users.find(user => 
            user.email.toLowerCase() === email.toLowerCase() || 
            user.username.toLowerCase() === username.toLowerCase()
        );
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'User with this email or username already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: generateUserId(),
            fullName: fullName.trim(),
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            joinDate: new Date().toISOString(),
            course: 'Web Development', // Default course
            level: 'Beginner',
            progress: 0,
            completedProjects: 0,
            totalProjects: 10, // Default for new students
            studyHours: 0,
            certificates: [],
            skills: [],
            status: 'Active'
        };

        users.push(newUser);
        saveUsers();

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return user info (without password)
        const userResponse = { ...newUser };
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'Account created successfully! Welcome to Code Academy!',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration' 
        });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username/email and password are required' 
            });
        }

        // Find user by email or username
        const user = users.find(u => 
            u.email.toLowerCase() === username.toLowerCase() || 
            u.username.toLowerCase() === username.toLowerCase()
        );
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username/email or password' 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username/email or password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return user info (without password)
        const userResponse = { ...user };
        delete userResponse.password;

        res.json({
            success: true,
            message: `Welcome back, ${user.fullName}! You have successfully entered Code Academy!`,
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login' 
        });
    }
});

// Get current user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userResponse = { ...user };
        delete userResponse.password;

        res.json({ user: userResponse });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
});

// Get dashboard data
app.get('/api/dashboard', authenticateToken, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate additional stats
        const joinDate = new Date(user.joinDate);
        const daysSinceJoining = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
        
        const dashboardData = {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                course: user.course,
                level: user.level,
                joinDate: user.joinDate,
                status: user.status
            },
            stats: {
                progress: user.progress,
                completedProjects: user.completedProjects,
                totalProjects: user.totalProjects,
                studyHours: user.studyHours,
                certificatesEarned: user.certificates.length,
                skillsLearned: user.skills.length,
                daysSinceJoining
            },
            recentActivity: [
                {
                    type: 'project',
                    title: 'Completed JavaScript Fundamentals Quiz',
                    description: 'Scored 95% on advanced JavaScript concepts',
                    time: '2 hours ago',
                    icon: 'fas fa-trophy'
                },
                {
                    type: 'lesson',
                    title: 'Started React Components Module',
                    description: 'Beginning advanced React development',
                    time: '1 day ago',
                    icon: 'fas fa-play-circle'
                },
                {
                    type: 'achievement',
                    title: 'Earned "Problem Solver" Badge',
                    description: 'Completed 5 coding challenges in a row',
                    time: '3 days ago',
                    icon: 'fas fa-medal'
                }
            ],
            certificates: user.certificates,
            skills: user.skills
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Server error fetching dashboard data' });
    }
});

// Get all students (for students directory)
app.get('/api/students', authenticateToken, (req, res) => {
    try {
        const { search } = req.query;
        
        let filteredUsers = users.map(user => ({
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            course: user.course,
            level: user.level,
            progress: user.progress,
            joinDate: user.joinDate,
            status: user.status,
            completedProjects: user.completedProjects,
            totalProjects: user.totalProjects,
            studyHours: user.studyHours,
            certificates: user.certificates,
            skills: user.skills
        }));

        // Apply search filter if provided
        if (search && search.trim()) {
            const searchTerm = search.toLowerCase().trim();
            filteredUsers = filteredUsers.filter(user =>
                user.fullName.toLowerCase().includes(searchTerm) ||
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                user.id.toLowerCase().includes(searchTerm) ||
                user.course.toLowerCase().includes(searchTerm)
            );
        }

        // Calculate statistics
        const stats = {
            totalStudents: users.length,
            activeStudents: users.filter(u => u.status === 'Active').length,
            averageProgress: Math.round(users.reduce((sum, u) => sum + u.progress, 0) / users.length),
            coursesOffered: [...new Set(users.map(u => u.course))].length
        };

        res.json({
            success: true,
            students: filteredUsers,
            stats,
            total: filteredUsers.length
        });
    } catch (error) {
        console.error('Students error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error fetching students data' 
        });
    }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, course } = req.body;
        
        const userIndex = users.findIndex(u => u.id === req.user.userId);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user data
        if (firstName) users[userIndex].firstName = firstName.trim();
        if (lastName) users[userIndex].lastName = lastName.trim();
        if (course) users[userIndex].course = course;

        saveUsers();

        const userResponse = { ...users[userIndex] };
        delete userResponse.password;

        res.json({
            message: 'Profile updated successfully!',
            user: userResponse
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// Logout endpoint (client-side token removal)
app.post('/api/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Code Academy Gatekeeper API is running',
        timestamp: new Date().toISOString(),
        totalUsers: users.length
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Handle 404 for other routes - redirect to home
app.use('*', (req, res) => {
    res.redirect('/');
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Code Academy Gatekeeper Server Started!');
    console.log(`📝 Server running on http://localhost:${PORT}`);
    console.log(`👥 Total users loaded: ${users.length}`);
    console.log('📚 Available pages:');
    console.log('   🏠 Home: http://localhost:' + PORT + '/');
    console.log('   📝 Signup: http://localhost:' + PORT + '/signup');
    console.log('   🔐 Login: http://localhost:' + PORT + '/login');
    console.log('   📊 Dashboard: http://localhost:' + PORT + '/dashboard');
    console.log('   👥 Students: http://localhost:' + PORT + '/students');
    console.log('🔧 Demo accounts:');
    console.log('   📧 demo@codeacademy.com / demo123');
    console.log('   📧 jane@codeacademy.com / jane123');
    console.log('   📧 mike@codeacademy.com / mike123');
    console.log('─'.repeat(50));
});