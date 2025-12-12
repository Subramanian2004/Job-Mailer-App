// Draft Auto-Save Feature
class DraftManager {
  constructor() {
    this.DRAFT_KEY = 'mailmage_draft';
    this.AUTO_SAVE_DELAY = 1000; // Save after 1 second of inactivity
    this.saveTimeout = null;
    
    this.initializeDraft();
    this.attachEventListeners();
  }

  initializeDraft() {
    const savedDraft = this.getDraft();
    
    if (savedDraft && this.isDraftValid(savedDraft)) {
      this.showDraftRecovered();
      
      // Fill form with saved draft
      const toField = document.getElementById('toEmail') || document.getElementById('to');
      const subjectField = document.getElementById('subject');
      const bodyField = document.getElementById('emailBody') || document.getElementById('body') || document.querySelector('textarea');
      
      if (toField) toField.value = savedDraft.to || '';
      if (subjectField) subjectField.value = savedDraft.subject || '';
      if (bodyField) bodyField.value = savedDraft.body || '';
    }
  }

  attachEventListeners() {
    // Find your form fields (adjust IDs based on your HTML)
    const toField = document.getElementById('toEmail') || document.getElementById('to');
    const subjectField = document.getElementById('subject');
    const bodyField = document.getElementById('emailBody') || document.getElementById('body') || document.querySelector('textarea');
    
    [toField, subjectField, bodyField].forEach(field => {
      if (field) {
        field.addEventListener('input', () => {
          this.scheduleSave();
        });
      }
    });

    // Clear draft when email is sent
    const sendButton = document.querySelector('button[type="submit"]') || document.getElementById('sendEmail');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        this.clearDraft();
      });
    }
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
    const toField = document.getElementById('toEmail') || document.getElementById('to');
    const subjectField = document.getElementById('subject');
    const bodyField = document.getElementById('emailBody') || document.getElementById('body') || document.querySelector('textarea');

    const draft = {
      to: toField ? toField.value : '',
      subject: subjectField ? subjectField.value : '',
      body: bodyField ? bodyField.value : '',
      timestamp: new Date().toISOString(),
      lastModified: Date.now()
    };

    if (draft.to || draft.subject || draft.body) {
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
    const indicator = document.getElementById('draftIndicator');
    if (indicator) {
      indicator.style.display = 'inline-block';
      indicator.textContent = '✓ Draft saved';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 2000);
    }
  }

  showDraftRecovered() {
    const notification = document.createElement('div');
    notification.className = 'draft-recovered';
    notification.innerHTML = '✨ Draft recovered from last session';
    notification.style.cssText = 'background: #4CAF50; color: white; padding: 10px; margin: 10px 0; border-radius: 5px;';
    
    const form = document.querySelector('form');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(notification, form);
      setTimeout(() => notification.remove(), 5000);
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  new DraftManager();
});
