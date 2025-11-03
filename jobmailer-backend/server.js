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
const nodemailer = require('nodemailer');
const pdf = require('pdf-parse');
require('dotenv').config();

// --- Multer Configuration for file uploads ---
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

const app = express();

// --- Middleware ---
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Parse JSON bodies
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Initialize the Generative AI model ---
console.log('Initializing Gemini AI with API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-pro model which is more stable
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

// Test the model on startup
model.generateContent("test").then(() => {
    console.log("✓ Gemini model initialized successfully");
}).catch(err => {
    console.error("✗ Gemini model initialization failed:", err.message);
});

// --- PostgreSQL Connection ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
pool.connect().then(() => console.log('Connected to PostgreSQL database')).catch(err => console.error('DB Connection Error', err.stack));

// --- Middleware to Authenticate JWT Token  ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Route: Verify token validity
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

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

// --- AI Email Generation Route ---
app.post('/api/ai/generate-email', upload.single('resume'), async (req, res) => {
    const { role, userName } = req.body;
    
    if (!req.file || !role || !userName) {
        return res.status(400).json({ message: 'Missing required information.' });
    }

    try {
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text;

        // Create a fresh model instance
        const emailModel = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

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

        const result = await emailModel.generateContent(prompt);
        const response = await result.response;
        const fullEmailBody = response.text();
        
        res.json({ emailBody: fullEmailBody });

    } catch (error) {
        console.error('AI generation error:', error);
        
        if (error.status === 404) {
            return res.status(500).json({ 
                message: 'AI model configuration error. Please check the model name.',
                error: error.message 
            });
        } else if (error.message && error.message.includes('503')) {
            return res.status(503).json({ 
                message: 'The AI model is currently busy. Please try again in a few moments.' 
            });
        }
        
        res.status(500).json({ message: 'Failed to generate email body.' });
    }
});

// --- NEW EMAIL DISPATCH ROUTE ---
app.post('/api/emails/dispatch', authenticateToken, upload.single('resume'), async (req, res) => {
    const { recruiterEmail, role, emailBody, userName } = req.body;
    
    if (!recruiterEmail || !role || !emailBody || !req.file) {
        return res.status(400).json({ message: 'Missing required fields for sending email.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, 
        },
    });

    const subject = `Application for ${role} - ${userName}`;

    const mailOptions = {
        from: `"${userName}" <${process.env.EMAIL_USER}>`,
        replyTo: req.user.email,
        to: recruiterEmail,
        subject: subject,
        html: emailBody.replace(/\n/g, '<br>'),
        attachments: [
            {
                filename: req.file.originalname,
                content: req.file.buffer,
            },
        ],
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Nodemailer Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
});

// --- EMAIL HISTORY ROUTES ---
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const historyResult = await pool.query(
            'SELECT * FROM email_history WHERE user_id = $1 ORDER BY sent_at DESC',
            [userId]
        );
        res.json(historyResult.rows);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Failed to retrieve email history.' });
    }
});

app.post('/api/history', authenticateToken, async (req, res) => {
    const { recruiterEmail, role, emailBody, resumeFile } = req.body;
    const userId = req.user.id;

    if (!recruiterEmail || !role || !emailBody) {
        return res.status(400).json({ message: 'Missing required history data.' });
    }

    try {
        const newHistoryEntry = await pool.query(
            `INSERT INTO email_history (user_id, recruiter_email, role, email_body, resume_file, sent_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [userId, recruiterEmail, role, emailBody, resumeFile]
        );
        res.status(201).json(newHistoryEntry.rows[0]);
    } catch (error) {
        console.error('Error saving history:', error);
        res.status(500).json({ message: 'Failed to save email to history.' });
    }
});

app.delete('/api/history/:id', authenticateToken, async (req, res) => {
    try {
        const historyId = req.params.id;
        const userId = req.user.id;

        const deleteResult = await pool.query(
            'DELETE FROM email_history WHERE id = $1 AND user_id = $2 RETURNING *',
            [historyId, userId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: 'History item not found or you do not have permission to delete it.' });
        }

        res.status(200).json({ message: 'History item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting history:', error);
        res.status(500).json({ message: 'Failed to delete history item.' });
    }
});

// Route for sending general emails
app.post('/api/emails/dispatch-general', authenticateToken, upload.single('attachment'), async (req, res) => {
    const { recipientEmail, subject, emailBody, userName } = req.body;

    if (!recipientEmail || !subject || !emailBody || !userName) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"${userName}" <${process.env.EMAIL_USER}>`,
        replyTo: req.user.email,
        to: recipientEmail,
        subject: subject,
        html: emailBody.replace(/\n/g, '<br>'),
        attachments: [],
    };
    
    if (req.file) {
        mailOptions.attachments.push({
            filename: req.file.originalname,
            content: req.file.buffer,
            contentType: req.file.mimetype,
        });
    }

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('General Nodemailer Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
});

// AI Compose Email Route
app.post('/api/ai/compose-email', authenticateToken, async (req, res) => {
    const { points } = req.body;
    
    // Get userName from the database
    let userName = 'User';
    try {
        const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length > 0) {
            userName = userResult.rows[0].name;
        }
    } catch (error) {
        console.error('Error fetching user name:', error);
    }

    if (!points) {
        return res.status(400).json({ message: 'Key points are required.' });
    }

    const prompt = `
        You are an AI assistant that writes professional emails.
        Analyze the user's key points and generate a JSON object containing a suitable "subject" and a full "emailBody".

        **CRITICAL:** Your output MUST be a valid JSON object in the format: {"subject": "string", "emailBody": "string"}. Do not include any other text or markdown formatting.

        **Instructions for Generation:**
        1.  **Subject:** Create a concise, professional subject line that accurately summarizes the key points.
        2.  **Email Body:** Expand the user's points into a complete, well-formatted, and professional email. Include a suitable greeting (e.g., "Hello,") and a closing signature (e.g., "Best regards,\n${userName}").

        **User's Key Points to analyze:**
        ---
        ${points}
        ---
    `;

    try {
        const composeModel = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
        
        const result = await composeModel.generateContent(prompt);
        const response = await result.response;
        
        // Clean the response to ensure it's valid JSON
        let jsonString = response.text().replace(/```json\n/g, '').replace(/```/g, '').trim();
        
        // Find JSON object in the response
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }
        
        const emailData = JSON.parse(jsonString);
        res.json(emailData);

    } catch (error) {
        console.error("AI composition error:", error);
        
        if (error instanceof SyntaxError) {
            return res.status(500).json({ 
                message: 'Failed to parse AI response. Please try again.',
                error: 'JSON parsing error' 
            });
        }
        
        if (error.status === 404) {
            return res.status(500).json({ 
                message: 'AI model not found. Please contact support.',
                error: error.message 
            });
        }
        
        res.status(503).json({ message: "AI service is currently unavailable. Please try again." });
    }
});

// Test route to check model status
app.get('/api/test/model-status', async (req, res) => {
    try {
        const testModel = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
        const result = await testModel.generateContent("Say 'Hello'");
        const response = await result.response;
        const text = response.text();
        res.json({ 
            status: 'Model is working', 
            testResponse: text,
            modelUsed: 'models/gemini-2.5-flash'
        });
    } catch (error) {
        res.json({ 
            status: 'Model error', 
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
