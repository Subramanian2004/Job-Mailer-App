
let emailHistory = []; // This will be populated from the database
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async function() {
    // Check for authentication first
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    // --- FIX: Call the newly added setupProfileDropdown function ---
    setupProfileDropdown(); 
    
    // Load history from the database
    await loadEmailHistoryFromDB();
    
    // Setup event listeners
    document.getElementById('search-role').addEventListener('input', filterEmails);
    document.getElementById('search-emails').addEventListener('input', filterEmails);
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'email-modal') closeModal();
    });
});

// --- ADDED: The missing setupProfileDropdown function ---
function setupProfileDropdown() {
    const profilePic = document.getElementById('profile-pic');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const userData = JSON.parse(localStorage.getItem('userData'));

    // Gracefully exit if elements don't exist
    if (!profilePic || !dropdownMenu || !userData) return;

    // Populate user info in the dropdown
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    if (userNameEl) userNameEl.textContent = userData.name;
    if (userEmailEl) userEmailEl.textContent = userData.email;

    // Toggle dropdown visibility
    profilePic.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents the document click from firing immediately
        dropdownMenu.classList.toggle('active');
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear(); // Clears token, user data, etc.
            window.location.href = './home.html';
        });
    }

    // Close dropdown if user clicks outside of it
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });
    // Prevent dropdown from closing when clicking inside it
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());
}


async function loadEmailHistoryFromDB() {
    const token = localStorage.getItem('userToken');
    try {
        const response = await fetch('http://localhost:3000/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not fetch history.');
        
        emailHistory = await response.json();
        displayEmails();
        updateStats();
    } catch (error) {
        console.error('Error loading email history:', error);
        document.getElementById('email-history-body').innerHTML = 
            '<tr><td colspan="5" style="text-align: center;">Error loading history.</td></tr>';
    }
}

function displayEmails(filteredData = null) {
    const data = filteredData || emailHistory;
    const tbody = document.getElementById('email-history-body');
    tbody.innerHTML = '';
    
    // --- FIX: Re-added the missing startIndex and endIndex definitions ---
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No sent emails found.</td></tr>';
        updatePagination(0); // Update pagination to show correctly for empty results
        return;
    }
    
    paginatedData.forEach(email => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${email.recruiter_email}</td>
            <td>${email.role}</td>
            <td>${formatDate(email.sent_at)}</td>
            <td><span class="status-badge status-sent">sent</span></td>
            <td>
                <div class="action-btns">
                    <button class="view-btn" onclick="viewEmail(${email.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="resend-btn" onclick="resendEmail(${email.id})"><i class="fas fa-redo"></i> Resend</button>
                    <button class="delete-btn" onclick="deleteEmail(${email.id})"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination(data.length);
}


async function deleteEmail(id) {
    const emailToDelete = emailHistory.find(e => e.id === id);
    if (!emailToDelete) return;

    if (confirm(`Are you sure you want to delete the email to ${emailToDelete.recruiter_email}?`)) {
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`http://localhost:3000/api/history/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete on server.');
            
            emailHistory = emailHistory.filter(email => email.id !== id);
            displayEmails();
            updateStats();
        } catch (error) {
            alert("Could not delete the history item. Please try again.");
        }
    }
}

// All your other functions (viewEmail, resendEmail, filterEmails, etc.) are fine.
// Make sure they are present below this line.

function viewEmail(id) {
    const email = emailHistory.find(e => e.id === id);
    if (email) {
        const content = document.getElementById('email-preview-content');
        content.innerHTML = `
            <p><strong>To:</strong> ${email.recruiter_email}</p>
            <p><strong>Role:</strong> ${email.role}</p>
            <p><strong>Date:</strong> ${formatDate(email.sent_at)}</p>
            <p><strong>Status:</strong> <span class="status-badge status-sent">sent</span></p>
            <hr>
            <p><strong>Email Body:</strong></p>
            <div class="email-body-container">${email.email_body}</div>`;
        document.getElementById('email-modal').style.display = 'block';
    }
}

async function resendEmail(id) {
    const email = emailHistory.find(e => e.id === id);
    if (email) {
        localStorage.setItem('resendData', JSON.stringify({
            recruiterEmail: email.recruiter_email,
            role: email.role,
            emailBody: email.email_body
        }));
        window.location.href = './index.html';
    }
}

function filterEmails() {
    const emailSearchTerm = document.getElementById('search-emails').value.toLowerCase();
    const roleSearchTerm = document.getElementById('search-role').value.toLowerCase();
    
    let filtered = emailHistory;
    
    if (emailSearchTerm) {
        filtered = filtered.filter(email => 
            email.recruiter_email.toLowerCase().includes(emailSearchTerm)
        );
    }
    
    if (roleSearchTerm) {
        filtered = filtered.filter(email => 
            email.role.toLowerCase().includes(roleSearchTerm)
        );
    }
    
    currentPage = 1;
    displayEmails(filtered);
}

function updateStats() {
    const totalSent = emailHistory.length;
    const uniqueRoles = [...new Set(emailHistory.map(e => e.role))].length;
    
    // Quick fix for sent today until status is in DB
    const todayStr = new Date().toISOString().split('T')[0];
    const sentToday = emailHistory.filter(e => e.sent_at.startsWith(todayStr)).length;
    
    document.getElementById('total-sent').textContent = totalSent;
    document.getElementById('sent-today').textContent = sentToday;
    document.getElementById('unique-roles').textContent = uniqueRoles;
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
}

function changePage(direction) {
    const totalPages = Math.ceil(emailHistory.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    displayEmails();
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function closeModal() {
    document.getElementById('email-modal').style.display = 'none';
}
