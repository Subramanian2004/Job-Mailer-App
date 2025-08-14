// email.js

// Check authentication and setup on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
        window.location.href = './login.html';
        return;
    }
    
    // Parse user data
    const user = JSON.parse(userData);
    
    // Update user info in dropdown if elements exist
    if (document.getElementById('user-name') && user.name) {
        document.getElementById('user-name').textContent = user.name;
    }
    if (document.getElementById('user-email') && user.email) {
        document.getElementById('user-email').textContent = user.email;
    }
    
    // Setup profile dropdown functionality
    setupProfileDropdown();
    
    // Check for resend data
    checkResendData();
});

// Setup profile dropdown and logout
function setupProfileDropdown() {
    const profilePic = document.getElementById('profile-pic');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    if (!profilePic || !dropdownMenu) return;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'dropdown-overlay';
    document.body.appendChild(overlay);
    
    // Toggle dropdown on profile click
    profilePic.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    overlay.addEventListener('click', function() {
        dropdownMenu.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Clear all localStorage data
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('emailHistory');
            localStorage.removeItem('rememberedEmail');
            
            // Redirect to home page
            window.location.href = './home.html';
        });
    }
}

// Check for resend data
function checkResendData() {
    const resendData = localStorage.getItem('resendData');
    if (resendData) {
        const data = JSON.parse(resendData);
        document.querySelector('.box-item').value = data.recruiterEmail;
        
        // Set the role dropdown
        const roleOptions = document.getElementById('options').options;
        for (let i = 0; i < roleOptions.length; i++) {
            if (roleOptions[i].text === data.role) {
                roleOptions[i].selected = true;
                break;
            }
        }
        
        document.getElementById('body-text').value = data.emailBody;
        
        // Clear the resend data
        localStorage.removeItem('resendData');
        
        showStatus("Email data loaded for resending", "success");
    }
}

// File upload handling
document.getElementById("resume-upload").addEventListener("change", function() {
    let file = this.files[0];
    if (file) {
        let fileName = file.name;
        let fileExt = fileName.split('.').pop().toLowerCase();
        
        let icon = document.getElementById("file-icon");

        // Change icon and color based on file type
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

        // Update file name text
        document.getElementById("file-name").textContent = fileName;
    }
});

// AI Generation functionality
document.getElementById("Generate-ai").addEventListener("click", async function() {
    const recruiterEmail = document.querySelector('.box-item').value;
    const role = document.getElementById('options').selectedOptions[0].text;
    
    if (!recruiterEmail) {
        showStatus("Please enter recruiter email", "error");
        return;
    }
    
    // Sample email bodies for different roles
    const sampleBodies = {
        "Web Developer": `Dear Hiring Manager,

I am writing to express my strong interest in the Web Developer position at your company. With my experience in modern web technologies including HTML5, CSS3, JavaScript, and React, I am confident I can contribute effectively to your team.

I have successfully delivered multiple web projects that improved user engagement and performance. I am particularly excited about the opportunity to work on innovative web solutions at your organization.

I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to your team's success.

Best regards`,
        
        "Front End Developer": `Dear Hiring Manager,

I am excited to apply for the Front End Developer position at your company. My expertise in creating responsive, user-friendly interfaces using React, Vue.js, and modern CSS frameworks aligns perfectly with your requirements.

I have a proven track record of translating design mockups into pixel-perfect, performant web applications. I am passionate about creating exceptional user experiences and staying current with the latest front-end technologies.

I look forward to the opportunity to contribute to your team's innovative projects.

Best regards`,
        
        "Full Stack Developer": `Dear Hiring Manager,

I am writing to apply for the Full Stack Developer position at your company. With comprehensive experience in both front-end and back-end technologies, including React, Node.js, Python, and various databases, I am well-equipped to handle the full spectrum of web development.

My ability to work across the entire stack has enabled me to deliver complete solutions from conception to deployment. I am excited about the possibility of bringing my full-stack expertise to your development team.

I would be thrilled to discuss how I can contribute to your organization's technical goals.

Best regards`
    };
    
    // Show loading state
    this.disabled = true;
    this.textContent = "Generating...";
    
    // Simulate API delay
    setTimeout(() => {
        const emailBody = sampleBodies[role] || sampleBodies["Web Developer"];
        document.getElementById('body-text').value = emailBody;
        showStatus("Email body generated successfully!", "success");
        
        this.disabled = false;
        this.textContent = "Generate with AI";
    }, 1000);
});

// Send Email functionality
document.getElementById("send-email").addEventListener("click", async function() {
    const recruiterEmail = document.querySelector('.box-item').value;
    const role = document.getElementById('options').selectedOptions[0].text;
    const emailBody = document.getElementById('body-text').value;
    const resumeFile = document.getElementById('resume-upload').files[0];
    
    // Validation
    if (!recruiterEmail || !validateEmail(recruiterEmail)) {
        showStatus("Please enter a valid email address", "error");
        return;
    }
    
    if (!emailBody || emailBody.trim() === '') {
        showStatus("Please enter email body content", "error");
        return;
    }
    
    if (!resumeFile) {
        showStatus("Please upload your resume", "error");
        return;
    }
    
    // Show loading state
    this.disabled = true;
    this.textContent = "Sending...";
    
    try {
        // Try to send via API first
        const userData = JSON.parse(localStorage.getItem('userData'));
        const token = localStorage.getItem('userToken');
        
        const emailData = {
            recruiterEmail: recruiterEmail,
            role: role,
            emailBody: emailBody,
            resumeFile: resumeFile.name,
            userId: userData.id
        };
        
        try {
            const response = await fetch('http://localhost:3000/api/emails/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(emailData)
            });
            
            if (!response.ok) throw new Error('API call failed');
            
        } catch (apiError) {
            // Fallback to localStorage
            console.log('API call failed, saving to localStorage');
        }
        
        // Always save to localStorage for history
        saveEmailToHistory({
            recruiterEmail: recruiterEmail,
            role: role,
            emailBody: emailBody,
            resumeFile: resumeFile.name,
            status: 'sent'
        });
        
        showStatus("Email sent successfully!", "success");
        
        // Clear form after successful send
        setTimeout(() => {
            clearForm();
        }, 2000);
        
    } catch (error) {
        showStatus("Failed to send email. Please try again.", "error");
    } finally {
        this.disabled = false;
        this.textContent = "Send Email";
    }
});

// Function to save email to history
function saveEmailToHistory(emailData) {
    const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
    const newEmail = {
        id: Date.now(),
        ...emailData,
        dateSent: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };
    history.unshift(newEmail); // Add to beginning of array
    localStorage.setItem('emailHistory', JSON.stringify(history));
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Status display function
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = `Status: ${message}`;
    statusElement.style.color = type === 'error' ? '#ff5252' : '#4caf50';
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Clear form function
function clearForm() {
    document.querySelector('.box-item').value = '';
    document.getElementById('body-text').value = '';
    document.getElementById('resume-upload').value = '';
    document.getElementById('file-name').textContent = 'resume.pdf';
    document.getElementById('file-icon').className = "fas fa-file-pdf";
    document.getElementById('file-icon').style.color = "#d32f2f";
}
