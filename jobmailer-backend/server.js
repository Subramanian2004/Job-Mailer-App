// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');
const pdf = require('pdf-parse');

// --- Multer Configuration for file uploads ---
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors()); // Allow requests from your frontend
app.use(express.json()); // Parse JSON bodies
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Initialize the Generative AI model ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// --- PostgreSQL Connection ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
pool.connect().then(() => console.log('Connected to PostgreSQL database')).catch(err => console.error('DB Connection Error', err.stack));


// --- Passport.js (Google OAuth) Configuration ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // Find or create user
        const googleId = profile.id;
        const email = profile.emails[0].value;
        const name = profile.displayName;

        let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

        if (user.rows.length === 0) {
            // User doesn't exist, create them
            const newUser = await pool.query(
                'INSERT INTO users (name, email, google_id, last_login) VALUES ($1, $2, $3, NOW()) RETURNING *',
                [name, email, googleId]
            );
            user = newUser;
        } else {
            // User exists, update last login
            await pool.query('UPDATE users SET last_login = NOW() WHERE google_id = $1', [googleId]);
        }
        
        return done(null, user.rows[0]);
    } catch (error) {
        return done(error, false);
    }
  }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, user.rows[0]);
    } catch (error) {
        done(error, null);
    }
});


// --- API Routes ---

// Signup with Email/Password
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: 'User created successfully!', user: newUser.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login with Email/Password
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = userResult.rows[0];
        if (!user.password) { // User likely signed up with Google
            return res.status(401).json({ message: 'Please log in with Google.' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Google OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html?error=auth_failed' }),
  (req, res) => {
    // Successful authentication
    const user = req.user;
    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
    
    // Redirect to a success page on the frontend with the token
    const frontendUrl = 'http://127.0.0.1:5500'; // Or your frontend server URL
    res.redirect(`${frontendUrl}/auth-success.html?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }))}`);
  }
);

// --- AI Email Generation Route ---
// Note: 'upload.single('resume')' matches the field name from the frontend
app.post('/api/ai/generate-email', upload.single('resume'), async (req, res) => {
    const { role, userName } = req.body;
    
    if (!req.file || !role || !userName) {
        return res.status(400).json({ message: 'Missing required information.' });
    }

    try {
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text;

        // --- THE "CONDITIONAL LOGIC" PROMPT ---
        const prompt = `
            You are a career assistant writing a factual and concise email for the role of:
            **Job Role:** "${role}"

            **CRITICAL RULE:** You must ONLY use information explicitly mentioned in the "Resume Content to Analyze". DO NOT invent or exaggerate any details (years of experience, employers, etc.).

            **Primary Task:** First, evaluate if the resume's content shows relevant professional work experience for the "${role}" role. Then, generate ONE of the following two types of emails based on your evaluation:

            **1. If the resume IS a strong match (shows relevant work experience):** Write an email highlighting specific professional achievements, skills, and projects from the resume that align directly with the role.

            **2. If the resume is NOT a strong match (lacks direct professional experience):** Write an entry-level/fresher email. This email MUST focus on enthusiasm, strong foundational skills, academic/personal projects mentioned in the resume, and a strong desire to learn and contribute. Avoid mentioning professional experience if it is not present.

            **Strict Constraint:**
            The main body (excluding greeting and signature) must be between 90 and 120 words.

            **Instructions for the chosen email type:**
            - Greeting: Start with "Dear Hiring Manager,".
            - Introduction: Express strong interest in the "${role}" position.
            - Body: Provide brief evidence from the resume (either professional or project-based).
            - Closing: End with a single sentence expressing enthusiasm and noting the attached resume.
            - Signature: Use "Best regards," followed by the applicant's name ("${userName}") on a new line.
            - URL Extraction: If the resume contains portfolio links (GitHub, LinkedIn, etc.), add them below the applicant's name.

            **Resume Content to Analyze:**
            ---
            ${resumeText.substring(0, 4000)}
            ---
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const fullEmailBody = response.text();
        
        res.json({ emailBody: fullEmailBody });

    } catch (error) {
        console.error('AI generation error:', error);
        if (error.message && error.message.includes('503 Service Unavailable')) {
            return res.status(503).json({ message: 'The AI model is currently busy. Please try again in a few moments.' });
        }
        res.status(500).json({ message: 'Failed to generate email body.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
