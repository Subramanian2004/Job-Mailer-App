// email.js

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. Authentication and User Setup ---
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = './login.html';
        return; // Stop execution if not logged in
    }
    
    setupProfileDropdown(); 
    checkResendData();

    // --- 2. Attach ALL Event Listeners ---
    // This is the crucial fix.
    
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
});


// --- Helper Functions ---

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
    formData.append('userName', userName); // Send the user's name to the backend

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
    const button =  document.getElementById('send-email');
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

     // Use FormData to send text and the file
    const formData = new FormData();
    formData.append('recruiterEmail', recruiterEmail);
    formData.append('role', role);
    formData.append('emailBody', emailBody);
    formData.append('resume', resumeFile);
    formData.append('userName', userData.name);

    try {
        const token = localStorage.getItem('userToken');

        // Dispatch the email using the Nodemailer route
        const dispatchResponse = await fetch('http://localhost:3000/api/emails/dispatch', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const dispatchResult = await dispatchResponse.json();
        if (!dispatchResponse.ok) {
            throw new Error(dispatchResult.message || 'Failed to send email.');
        }


        // If sending was successful, save the record to the database history
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
            // If saving to DB fails, we can fall back to localStorage as a temporary measure
            // or just show an error. For now, we'll just log it.
            console.error("Failed to save history to database.");
        }

        showStatus("Email sent successfully!", "success");
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
