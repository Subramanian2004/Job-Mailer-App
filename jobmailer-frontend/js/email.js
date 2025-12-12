class ProfessionalDraftManager {
    constructor() {
        this.DRAFT_KEY = 'mailmage_professional_draft';
        this.AUTO_SAVE_DELAY = 1000;
        this.saveTimeout = null;
        
        this.initializeDraft();
        this.attachEventListeners();
    }

    initializeDraft() {
        const savedDraft = this.getDraft();
        
        if (savedDraft && this.isDraftValid(savedDraft)) {
            this.showDraftRecovered();
            
            // Fill form with saved draft
            const recruiterEmailField = document.querySelector('input[type="email"]');
            const roleField = document.getElementById('role-input');
            const bodyField = document.getElementById('body-text');
            
            if (recruiterEmailField) recruiterEmailField.value = savedDraft.recruiterEmail || '';
            if (roleField) roleField.value = savedDraft.role || '';
            if (bodyField) bodyField.value = savedDraft.emailBody || '';
        }
    }

    attachEventListeners() {
        const recruiterEmailField = document.querySelector('input[type="email"]');
        const roleField = document.getElementById('role-input');
        const bodyField = document.getElementById('body-text');
        
        [recruiterEmailField, roleField, bodyField].forEach(field => {
            if (field) {
                field.addEventListener('input', () => {
                    this.scheduleSave();
                });
            }
        });
    }

    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveDraft();
        }, this.AUTO_SAVE_DELAY);
    }

    saveDraft() {
        const recruiterEmailField = document.querySelector('input[type="email"]');
        const roleField = document.getElementById('role-input');
        const bodyField = document.getElementById('body-text');

        const draft = {
            recruiterEmail: recruiterEmailField ? recruiterEmailField.value : '',
            role: roleField ? roleField.value : '',
            emailBody: bodyField ? bodyField.value : '',
            timestamp: new Date().toISOString(),
            lastModified: Date.now()
        };

        if (draft.recruiterEmail || draft.role || draft.emailBody) {
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
        const EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
        const age = Date.now() - draft.lastModified;
        return age < EXPIRY_TIME;
    }

    clearDraft() {
        localStorage.removeItem(this.DRAFT_KEY);
    }

    showSaveIndicator() {
        let indicator = document.getElementById('professionalDraftIndicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'professionalDraftIndicator';
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
        notification.innerHTML = '✨ <strong>Job Application Draft Recovered!</strong> We found your unsent application from the last session.';
        
        const container = document.querySelector('.container') || document.querySelector('.main-container') || document.body;
        container.insertBefore(notification, container.firstChild);
        
        setTimeout(() => notification.remove(), 5000);
    }
}

let professionalDraftManager;

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Authentication and User Setup ---
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = './login.html';
        return; // Stop execution if not logged in
    }
    
    setupProfileDropdown(); 
    checkResendData();
    
    // --- Initialize Draft Manager ---
    professionalDraftManager = new ProfessionalDraftManager();

    // --- 2. Attach ALL Event Listeners ---
    
    const resumeUpload = document.getElementById("resume-upload");
    if (resumeUpload) {
        resumeUpload.addEventListener("change", handleFileChange);
    }

    const generateBtn = document.getElementById("Generate-ai");
    if (generateBtn) {
        generateBtn.addEventListener("click", generateAIEmail);
    }

    const sendBtn = document.getElementById("send-email");
    if (sendBtn) {
        sendBtn.addEventListener("click", sendEmail);
    }
    
    // --- Add Clear Draft Button ---
    addClearDraftButton();
});

// --- NEW: Add Clear Draft Button ---
function addClearDraftButton() {
    const sendBtn = document.getElementById("send-email");
    if (sendBtn && sendBtn.parentElement) {
        // Check if button already exists
        if (!document.getElementById('clear-professional-draft')) {
            const clearDraftBtn = document.createElement('button');
            clearDraftBtn.type = 'button';
            clearDraftBtn.id = 'clear-professional-draft';
            clearDraftBtn.innerHTML = '<i class="fas fa-trash"></i> Clear Draft';
            clearDraftBtn.style.cssText = `
                background: #ff5252;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-left: 10px;
                font-size: 14px;
            `;
            clearDraftBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the job application draft?')) {
                    professionalDraftManager.clearDraft();
                    clearForm();
                    showStatus('Draft cleared successfully', 'success');
                }
            });
            sendBtn.parentElement.appendChild(clearDraftBtn);
        }
    }
}

function setupProfileDropdown() {
    const profilePic = document.getElementById('profile-pic');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!profilePic || !dropdownMenu || !userData) return;

    // Populate user info
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-email').textContent = userData.email;

    // Toggle dropdown
    profilePic.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear(); // Clears all user data
        window.location.href = './home.html';
    });

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
}

function checkResendData() {
    const resendData = localStorage.getItem('resendData');
    if (resendData) {
        const data = JSON.parse(resendData);
        document.querySelector('.box-item').value = data.recruiterEmail;
        document.getElementById('role-input').value = data.role;
        document.getElementById('body-text').value = data.emailBody;
        localStorage.removeItem('resendData');
        showStatus("Email data loaded for resending.", "success");
    }
}

function handleFileChange() {
    let file = this.files[0];
    if (file) {
        let fileName = file.name;
        let fileExt = fileName.split('.').pop().toLowerCase();
        let icon = document.getElementById("file-icon");

        if (fileExt === "pdf") {
            icon.className = "fas fa-file-pdf";
            icon.style.color = "#d32f2f";
        } else if (fileExt === "doc" || fileExt === "docx") {
            icon.className = "fas fa-file-word";
            icon.style.color = "#1976d2";
        } else {
            icon.className = "fas fa-file";
            icon.style.color = "#555";
        }
        document.getElementById("file-name").textContent = fileName;
    }
}

async function generateAIEmail() {
    const role = document.getElementById('role-input').value;
    const resumeFile = document.getElementById('resume-upload').files[0];
    const button = document.getElementById("Generate-ai");

    if (!role.trim()) {
        showStatus("Please enter a job role.", "error");
        return;
    }
    if (!resumeFile) {
        showStatus("Please upload your resume before generating.", "error");
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    const formData = new FormData();
    formData.append('role', role);
    formData.append('resume', resumeFile);

    const userName = JSON.parse(localStorage.getItem('userData')).name;
    formData.append('userName', userName);

    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch('http://localhost:3000/api/ai/generate-email', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'AI generation failed.');

        document.getElementById('body-text').value = data.emailBody;
        showStatus("Email body generated successfully!", "success");
        
        // Save as draft after AI generation
        professionalDraftManager.scheduleSave();

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        button.disabled = false;
        button.innerHTML = 'Generate with AI';
    }
}

async function sendEmail() {
    const recruiterEmail = document.querySelector('input[type="email"]').value;
    const role = document.getElementById('role-input').value; 
    const emailBody = document.getElementById('body-text').value;
    const resumeFile = document.getElementById('resume-upload').files[0];
    const button = document.getElementById('send-email');
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!recruiterEmail || !validateEmail(recruiterEmail)) {
        showStatus("Please enter a valid email address.", "error");
        return;
    }
    if (!role.trim()) {
        showStatus("Please enter a job role.", "error");
        return;
    }
    if (!emailBody.trim()) {
        showStatus("Email body cannot be empty.", "error");
        return;
    }
    if (!resumeFile) {
        showStatus("Please upload your resume.", "error");
        return;
    }

    button.disabled = true;
    button.textContent = "Sending...";

    const formData = new FormData();
    formData.append('recruiterEmail', recruiterEmail);
    formData.append('role', role);
    formData.append('emailBody', emailBody);
    formData.append('resume', resumeFile);
    formData.append('userName', userData.name);

    try {
        const token = localStorage.getItem('userToken');

        const dispatchResponse = await fetch('http://localhost:3000/api/emails/dispatch', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const dispatchResult = await dispatchResponse.json();
        if (!dispatchResponse.ok) {
            throw new Error(dispatchResult.message || 'Failed to send email.');
        }

        const historyResponse = await fetch('http://localhost:3000/api/history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recruiterEmail: recruiterEmail,
                role: role,
                emailBody: emailBody,
                resumeFile: resumeFile.name
            })
        });

        if (!historyResponse.ok) {
            console.error("Failed to save history to database.");
        }

        showStatus("Email sent successfully!", "success");
        
        // Clear draft after successful send
        professionalDraftManager.clearDraft();
        
        clearForm();

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Send Email";
    }
}

function saveEmailToHistory(emailData) {
    const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
    const newEmail = { id: Date.now(), ...emailData, dateSent: new Date().toISOString(), status: 'sent' };
    history.unshift(newEmail);
    localStorage.setItem('emailHistory', JSON.stringify(history));
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    statusElement.textContent = `Status: ${message}`;
    statusElement.style.color = type === 'error' ? '#ff5252' : '#4caf50';
    statusElement.style.display = 'block';
    setTimeout(() => { statusElement.style.display = 'none'; }, 5000);
}

function clearForm() {
    document.querySelector('input[type="email"]').value = '';
    document.getElementById('role-input').value = '';
    document.getElementById('body-text').value = '';
    document.getElementById('resume-upload').value = '';
    document.getElementById('file-name').textContent = 'resume.pdf';
    document.getElementById('file-icon').className = "fas fa-file-pdf";
    document.getElementById('file-icon').style.color = "#d32f2f";
}

// Add CSS animations if not already present
if (!document.getElementById('professionalDraftAnimations')) {
    const style = document.createElement('style');
    style.id = 'professionalDraftAnimations';
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
}
