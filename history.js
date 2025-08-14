// history.js
let emailHistory = [];
let currentPage = 1;
const itemsPerPage = 10;

// Load email history when page loads
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
    
    // Load email history and setup page
    loadEmailHistory();
    updateStats();
    
    // Event listeners
    document.getElementById('search-emails').addEventListener('input', filterEmails);
    document.getElementById('search-role').addEventListener('input', filterEmails);
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'email-modal') closeModal();
    });
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

// Load email history from localStorage or API
async function loadEmailHistory() {
    try {
        // For now, using localStorage. Replace with API call later
        const savedHistory = localStorage.getItem('emailHistory');
        if (savedHistory) {
            emailHistory = JSON.parse(savedHistory);
        } else {
            // Sample data for demonstration
            emailHistory = [
                {
                    id: 1,
                    recruiterEmail: 'recruiter1@company.com',
                    role: 'Web Developer',
                    dateSent: '2024-01-15',
                    status: 'sent',
                    emailBody: 'Dear Hiring Manager, I am writing to express my interest...'
                }
            ];
        }
        
        displayEmails();
    } catch (error) {
        console.error('Error loading email history:', error);
    }
}

// Display emails with pagination
function displayEmails(filteredData = null) {
    const data = filteredData || emailHistory;
    const tbody = document.getElementById('email-history-body');
    tbody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No emails found</td></tr>';
        return;
    }
    
    paginatedData.forEach(email => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${email.recruiterEmail}</td>
            <td>${email.role}</td>
            <td>${formatDate(email.dateSent)}</td>
            <td><span class="status-badge status-${email.status || 'sent'}">${email.status || 'sent'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="view-btn" onclick="viewEmail(${email.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="resend-btn" onclick="resendEmail(${email.id})">
                        <i class="fas fa-redo"></i> Resend
                    </button>
                    <button class="delete-btn" onclick="deleteEmail(${email.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination(data.length);
}

// Update pagination info
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}

// Change page
function changePage(direction) {
    currentPage += direction;
    displayEmails();
}

// Filter emails
function filterEmails() {
    const emailSearchTerm = document.getElementById('search-emails').value.toLowerCase();
    const roleSearchTerm = document.getElementById('search-role').value.toLowerCase();
    
    let filtered = emailHistory; // Start with the full list
    
    // First, filter by the email search term
    if (emailSearchTerm) {
        filtered = filtered.filter(email => 
            email.recruiterEmail.toLowerCase().includes(emailSearchTerm)
        );
    }
    
    // THEN, filter the result by the role search term
    if (roleSearchTerm) {
        // This logic now checks if the email's role INCLUDES the search text
        filtered = filtered.filter(email => 
            email.role.toLowerCase().includes(roleSearchTerm)
        );
    }
    
    currentPage = 1; // Reset to the first page for new search results
    displayEmails(filtered);
}


// View email details
function viewEmail(id) {
    const email = emailHistory.find(e => e.id === id);
    if (email) {
        const modal = document.getElementById('email-modal');
        const content = document.getElementById('email-preview-content');
        
        content.innerHTML = `
            <p><strong>To:</strong> ${email.recruiterEmail}</p>
            <p><strong>Role:</strong> ${email.role}</p>
            <p><strong>Date:</strong> ${formatDate(email.dateSent)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${email.status || 'sent'}">${email.status || 'sent'}</span></p>
            <hr>
            <p><strong>Email Body:</strong></p>
            <div class="email-body-container">
                ${email.emailBody}
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// Resend email
async function resendEmail(id) {
    const email = emailHistory.find(e => e.id === id);
    if (email && confirm(`Resend email to ${email.recruiterEmail}?`)) {
        // Redirect to main page with pre-filled data
        localStorage.setItem('resendData', JSON.stringify({
            recruiterEmail: email.recruiterEmail,
            role: email.role,
            emailBody: email.emailBody
        }));
        window.location.href = './index.html';
    }
}

//Delete email
function deleteEmail(id) {
    // Find the email to be deleted
    const emailToDelete = emailHistory.find(e => e.id === id);
    if (!emailToDelete) return; // Exit if email not found

    // Ask for confirmation before deleting
    const isConfirmed = confirm(`Are you sure you want to delete the email sent to ${emailToDelete.recruiterEmail}?`);

    if (isConfirmed) {
        // 1. Filter out the email to be deleted from the main history array
        emailHistory = emailHistory.filter(email => email.id !== id);
        
        // 2. Update localStorage with the new, shorter array
        localStorage.setItem('emailHistory', JSON.stringify(emailHistory));
        
        // 3. Re-display the emails on the current page
        // We call displayEmails() without arguments to refresh from the updated emailHistory array
        displayEmails();
        
        // 4. Update the statistics cards
        updateStats();

        // You can implement a toast notification here if you like.
        console.log('Email deleted successfully.');
    }
}


// Close modal
function closeModal() {
    document.getElementById('email-modal').style.display = 'none';
}

// Update statistics
function updateStats() {
    const totalSent = emailHistory.length;
    const today = new Date().toISOString().split('T')[0];
    const sentToday = emailHistory.filter(e => e.dateSent === today).length;
    const uniqueRoles = [...new Set(emailHistory.map(e => e.role))].length;
    
    document.getElementById('total-sent').textContent = totalSent;
    document.getElementById('sent-today').textContent = sentToday;
    document.getElementById('unique-roles').textContent = uniqueRoles;
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Export function for use in main page
function saveEmailToHistory(emailData) {
    const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
    const newEmail = {
        id: Date.now(),
        ...emailData,
        dateSent: new Date().toISOString().split('T')[0],
        status: 'sent'
    };
    history.unshift(newEmail);
    localStorage.setItem('emailHistory', JSON.stringify(history));
}
