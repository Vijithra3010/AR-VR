require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Data storage
const DATA_FILE = 'data.json';

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }));
}

// Helper functions for data management
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return { users: [] };
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data file:', error);
        throw new Error('Failed to save data');
    }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const data = readData();
        
        if (data.users.some(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            filterHistory: []
        };
        
        data.users.push(newUser);
        writeData(data);
        
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const data = readData();
        const user = data.users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Filter History Routes
app.post('/api/filters', authenticateToken, async (req, res) => {
    try {
        const { filterName } = req.body;
        
        if (!filterName) {
            return res.status(400).json({ error: 'Filter name is required' });
        }

        console.log('Saving filter:', filterName, 'for user:', req.user.userId);
        
        const data = readData();
        const user = data.users.find(u => u.id === req.user.userId);
        
        if (!user) {
            console.error('User not found:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.filterHistory.push({ 
            filterName,
            timestamp: new Date().toISOString()
        });
        
        writeData(data);
        console.log('Filter saved successfully for user:', req.user.userId);
        res.status(201).json({ message: 'Filter saved successfully' });
    } catch (error) {
        console.error('Error saving filter:', error);
        res.status(500).json({ error: 'Failed to save filter' });
    }
});

app.get('/api/filters', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching filter history for user:', req.user.userId);
        const data = readData();
        const user = data.users.find(u => u.id === req.user.userId);
        
        if (!user) {
            console.error('User not found:', req.user.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('Filter history found:', user.filterHistory);
        res.json(user.filterHistory);
    } catch (error) {
        console.error('Error fetching filter history:', error);
        res.status(500).json({ error: 'Failed to fetch filter history' });
    }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server with error handling
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
}); 