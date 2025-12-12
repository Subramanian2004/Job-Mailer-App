class DraftManager {
    constructor() {
        this.DRAFT_KEY = 'mailmage_draft';
        this.AUTO_SAVE_DELAY = 1000; 
        this.saveTimeout = null;
        
        // Initialize after DOM is ready
        this.initializeDraft();
        this.attachEventListeners();
    }

    initializeDraft() {
        const savedDraft = this.getDraft();
        
        if (savedDraft && this.isDraftValid(savedDraft)) {
            // Show draft recovered notification
            this.showDraftRecovered();
            
            // Fill form with saved draft
            document.getElementById('recipient-email').value = savedDraft.recipientEmail || '';
            document.getElementById('email-subject').value = savedDraft.subject || '';
            document.getElementById('email-points').value = savedDraft.emailBody || '';
        }
    }

    attachEventListeners() {
        // Attach to your existing form fields
        const fields = ['recipient-email', 'email-subject', 'email-points'];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('input', () => {
                    this.scheduleSave();
                });
            }
        });
    }

    scheduleSave() {
        // Clear previous timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout
        this.saveTimeout = setTimeout(() => {
            this.saveDraft();
        }, this.AUTO_SAVE_DELAY);
    }

    saveDraft() {
        const draft = {
            recipientEmail: document.getElementById('recipient-email').value,
            subject: document.getElementById('email-subject').value,
            emailBody: document.getElementById('email-points').value,
            timestamp: new Date().toISOString(),
            lastModified: Date.now()
        };

        // Only save if there's actual content
        if (draft.recipientEmail || draft.subject || draft.emailBody) {
            localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
            this.showSaveIndicator();
        }
    }

    getDraft() {
        const draftString = localStorage.getItem(this.DRAFT_KEY);
        return draftString ? JSON.parse(draftString) : null;
    }

    isDraftValid(draft) {
        if (!draft || !draft.lastModified) return false;
        // Draft expires after 7 days
        const EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000;
        const age = Date.now() - draft.lastModified;
        return age < EXPIRY_TIME;
    }

    clearDraft() {
        localStorage.removeItem(this.DRAFT_KEY);
    }

    showSaveIndicator() {
        // Check if indicator exists, if not create it
        let indicator = document.getElementById('draftIndicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'draftIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                z-index: 1000;
                display: none;
                animation: fadeInOut 2s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.textContent = '✓ Draft saved';
        indicator.style.display = 'block';
        
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }

    showDraftRecovered() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: #2196F3;
            color: white;
            padding: 12px 20px;
            margin: 10px auto;
            border-radius: 5px;
            text-align: center;
            max-width: 500px;
            animation: slideDown 0.3s ease;
        `;
        notification.innerHTML = '✨ <strong>Draft Recovered!</strong> We found your unsent email from the last session.';
        
        const container = document.querySelector('.compose-container') || document.querySelector('.container') || document.body;
        container.insertBefore(notification, container.firstChild);
        
        setTimeout(() => notification.remove(), 5000);
    }
}

// Global draft manager instance
let draftManager;

document.addEventListener('DOMContentLoaded', function() {
    // Authentication Check
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    // Setup UI elements and listeners
    setupProfileDropdown();
    
    // Initialize Draft Manager - NEW
    draftManager = new DraftManager();
    
    // Attach Event Listeners to buttons
    document.getElementById('Generate-ai').addEventListener('click', generateAIEmail);
    document.getElementById('send-email').addEventListener('click', sendEmail);
    document.getElementById('file-attachment').addEventListener('change', handleFileChange);
    
    // Add clear draft button if needed - NEW
    addClearDraftButton();
});

// NEW FUNCTION - Add clear draft button
function addClearDraftButton() {
    const sendButton = document.getElementById('send-email');
    if (sendButton && sendButton.parentElement) {
        const clearDraftBtn = document.createElement('button');
        clearDraftBtn.type = 'button';
        clearDraftBtn.className = 'clear-draft-btn';
        clearDraftBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Draft';
        clearDraftBtn.style.cssText = `
            background: #ff5252;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 10px;
        `;
        clearDraftBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the draft?')) {
                draftManager.clearDraft();
                clearForm();
                showStatus('Draft cleared', 'info');
            }
        });
        sendButton.parentElement.appendChild(clearDraftBtn);
    }
}

function setupProfileDropdown() {
    // It handles the user info and logout button in the header
    const profilePic = document.getElementById('profile-pic');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!profilePic || !dropdownMenu || !userData) return;
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-email').textContent = userData.email;
    profilePic.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = './home.html';
    });
    document.addEventListener('click', () => dropdownMenu.classList.remove('active'));
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
}

function handleFileChange() {
    const fileInput = document.getElementById('file-attachment');
    const file = fileInput.files[0];
    const iconEl = document.getElementById('file-icon');
    const fileNameEl = document.getElementById('file-name');
    if (file) {
        fileNameEl.textContent = file.name;
        iconEl.className = "fas fa-file-alt";
        iconEl.style.color = "#4a9eff";
    } else {
        fileNameEl.textContent = "No file selected";
        iconEl.className = "fas fa-paperclip";
        iconEl.style.color = "#555";
    }
}

async function generateAIEmail() {
    const points = document.getElementById('email-points').value;
    const button = document.getElementById('Generate-ai');

    if (!points.trim()) {
        showStatus("Please provide some key points to generate the email.", "error");
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch('http://localhost:3000/api/ai/compose-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ points })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        document.getElementById('email-subject').value = data.subject;
        document.getElementById('email-points').value = data.emailBody;
        showStatus("Email generated successfully!", "success");
        
        // Save as draft after AI generation - NEW
        draftManager.scheduleSave();

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        button.disabled = false;
        button.innerHTML = 'Generate with AI';
    }
}

async function sendEmail() {
    const button = document.getElementById('send-email');
    
    const recipientEmail = document.getElementById('recipient-email').value;
    const subject = document.getElementById('email-subject').value;
    const emailBody = document.getElementById('email-points').value;
    const file = document.getElementById('file-attachment').files[0];
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Validation
    if (!recipientEmail || !validateEmail(recipientEmail) || !subject.trim() || !emailBody.trim()) {
        showStatus("Please fill in all fields correctly.", "error");
        return;
    }
    
    button.disabled = true;
    button.textContent = "Sending...";
    
    // FormData setup
    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail);
    formData.append('subject', subject);
    formData.append('emailBody', emailBody);
    formData.append('userName', userData.name);
    if (file) {
        formData.append('attachment', file);
    }

    try {
        // Dispatch email
        const token = localStorage.getItem('userToken');
        const dispatchResponse = await fetch('http://localhost:3000/api/emails/dispatch-general', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const dispatchResult = await dispatchResponse.json();
        if (!dispatchResponse.ok) throw new Error(dispatchResult.message);

        // Save to history
        const historyData = {
            recruiterEmail: recipientEmail,
            role: subject,
            emailBody: emailBody,
            resumeFile: file ? file.name : null
        };
        const historyResponse = await fetch('http://localhost:3000/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(historyData)
        });
        if (!historyResponse.ok) console.error("Email sent, but failed to save to history.");

        showStatus("Email sent successfully!", "success");
        
        // Clear draft after successful send - NEW
        draftManager.clearDraft();
        
        clearForm();

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Send Email";
    }
}

function clearForm() {
    document.getElementById('recipient-email').value = '';
    document.getElementById('email-subject').value = '';
    document.getElementById('email-points').value = '';
    document.getElementById('file-attachment').value = '';
    handleFileChange();
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = `Status: ${message}`;
    statusEl.style.color = type === 'error' ? '#ff5252' : '#4caf50';
    statusEl.style.display = 'block';
    setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; }
        100% { opacity: 0; }
    }
    
    @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
