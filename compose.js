
document.addEventListener('DOMContentLoaded', function() {
    // Authentication Check
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    // Setup UI elements and listeners
    setupProfileDropdown();
    
    // Attach Event Listeners to buttons
    document.getElementById('Generate-ai').addEventListener('click', generateAIEmail);
    document.getElementById('send-email').addEventListener('click', sendEmail);
    document.getElementById('file-attachment').addEventListener('change', handleFileChange);
});

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
    // ... (This function is correct from the previous step) ...
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

    } catch (error) {
        showStatus(error.message, "error");
    } finally {
        button.disabled = false;
        button.innerHTML = 'Generate with AI';
    }
}

// --- THIS FUNCTION IS THE PRIMARY FIX ---
async function sendEmail() {
    // --- FIX: Get the button element directly inside the function ---
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

