// Form validation and enhancement JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Form validation setup
  const form = document.querySelector('#quickAddForm');
  const saveBtn = document.querySelector('#saveSubBtn');
  
  // Required fields
  const requiredFields = {
    subName: {
      element: document.querySelector('#subName'),
      validator: (value) => value.trim().length > 0,
      message: 'Service name is required'
    },
    subCost: {
      element: document.querySelector('#subCost'),
      validator: (value) => value !== '' && parseFloat(value) >= 0,
      message: 'Please enter a valid cost'
    }
  };
  
  // Add real-time validation
  Object.keys(requiredFields).forEach(fieldName => {
    const field = requiredFields[fieldName];
    const input = field.element;
    const inputGroup = input.closest('.form-input-group');
    
    if (input && inputGroup) {
      // Validate on blur
      input.addEventListener('blur', function() {
        validateField(fieldName);
      });
      
      // Clear error on input
      input.addEventListener('input', function() {
        if (inputGroup.classList.contains('has-error')) {
          inputGroup.classList.remove('has-error');
        }
      });
    }
  });
  
  // Validate individual field
  function validateField(fieldName) {
    const field = requiredFields[fieldName];
    const input = field.element;
    const inputGroup = input?.closest('.form-input-group');
    
    if (!input || !inputGroup) return true;
    
    const value = input.value;
    const isValid = field.validator(value);
    
    if (!isValid) {
      inputGroup.classList.add('has-error');
      const errorMsg = inputGroup.querySelector('.form-error-message');
      if (errorMsg) {
        errorMsg.textContent = field.message;
      }
      return false;
    } else {
      inputGroup.classList.remove('has-error');
      return true;
    }
  }
  
  // Validate all fields
  function validateForm() {
    let isFormValid = true;
    
    Object.keys(requiredFields).forEach(fieldName => {
      const isFieldValid = validateField(fieldName);
      if (!isFieldValid) {
        isFormValid = false;
      }
    });
    
    return isFormValid;
  }
  
  // Handle form submission
  if (saveBtn) {
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Only validate basic tab fields if it's active
      const basicTab = document.querySelector('#basicFormTab');
      if (basicTab && basicTab.classList.contains('active')) {
        if (!validateForm()) {
          // Focus on first error field
          const firstError = document.querySelector('.form-input-group.has-error input');
          if (firstError) {
            firstError.focus();
          }
          return;
        }
      }
      
      // Add loading state
      const formContent = document.querySelector('.form-content');
      if (formContent) {
        formContent.classList.add('form-loading');
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
      }
      
      // Simulate save (integrate with your actual save logic)
      setTimeout(() => {
        // Reset loading state
        if (formContent) {
          formContent.classList.remove('form-loading');
        }
        saveBtn.textContent = 'Save Subscription';
        saveBtn.disabled = false;
        
        // Close modal (if you have this functionality)
        const modal = document.querySelector('#addFormModal');
        if (modal) {
          modal.classList.add('hidden');
        }
        
        // Reset form
        resetForm();
      }, 1500);
    });
  }
  
  // Reset form function
  function resetForm() {
    // Reset all input values
    const inputs = form?.querySelectorAll('input, select, textarea');
    inputs?.forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = input.hasAttribute('checked');
      } else {
        input.value = '';
      }
    });
    
    // Remove all error states
    const errorGroups = form?.querySelectorAll('.form-input-group.has-error');
    errorGroups?.forEach(group => {
      group.classList.remove('has-error');
    });
    
    // Reset to basic tab
    const basicTab = document.querySelector('[data-form-tab="basic"]');
    const basicContent = document.querySelector('#basicFormTab');
    const advancedTab = document.querySelector('[data-form-tab="advanced"]');
    const advancedContent = document.querySelector('#advancedFormTab');
    
    if (basicTab && basicContent && advancedTab && advancedContent) {
      basicTab.classList.add('active');
      advancedTab.classList.remove('active');
      basicContent.classList.add('active');
      advancedContent.classList.remove('active');
    }
  }
  
  // Auto-format currency inputs
  const currencyInputs = document.querySelectorAll('.currency-input');
  currencyInputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.value && !isNaN(this.value)) {
        this.value = parseFloat(this.value).toFixed(2);
      }
    });
  });
  
  // Set minimum date for billing date input (today)
  const billingDateInput = document.querySelector('#nextBillingDate');
  if (billingDateInput) {
    const today = new Date().toISOString().split('T')[0];
    billingDateInput.setAttribute('min', today);
    
    // Set default to today
    billingDateInput.value = today;
  }
  
  // URL validation and formatting
  const urlInput = document.querySelector('#subUrl');
  if (urlInput) {
    urlInput.addEventListener('blur', function() {
      let value = this.value.trim();
      if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
        this.value = 'https://' + value;
      }
    });
  }
  
  // Email validation
  const emailInput = document.querySelector('#subEmail');
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const inputGroup = this.closest('.form-input-group');
      
      if (this.value && !emailRegex.test(this.value)) {
        inputGroup?.classList.add('has-error');
        const errorMsg = inputGroup?.querySelector('.form-error-message');
        if (!errorMsg) {
          const error = document.createElement('span');
          error.className = 'form-error-message';
          error.textContent = 'Please enter a valid email address';
          inputGroup?.appendChild(error);
        }
      } else {
        inputGroup?.classList.remove('has-error');
      }
    });
  }
  
  // Tab switching enhancement
  const formTabs = document.querySelectorAll('.form-tab');
  formTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active from all tabs
      formTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Switch content
      const targetTab = this.getAttribute('data-form-tab');
      const allContents = document.querySelectorAll('.form-tab-content');
      allContents.forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.querySelector(`#${targetTab}FormTab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
  
  // Add visual feedback for priority selection
  const prioritySelect = document.querySelector('#subPriority');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', function() {
      // You can add custom styling based on priority
      const priority = this.value;
      this.className = `priority-${priority}`;
    });
  }
  
  // Character counter for description
  const descriptionTextarea = document.querySelector('#subDescription');
  if (descriptionTextarea) {
    const maxLength = 200;
    
    // Create character counter
    const counter = document.createElement('div');
    counter.className = 'form-hint';
    counter.style.textAlign = 'right';
    counter.textContent = `0 / ${maxLength} characters`;
    
    const parent = descriptionTextarea.parentElement;
    if (parent) {
      parent.appendChild(counter);
      
      descriptionTextarea.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length} / ${maxLength} characters`;
        
        if (length > maxLength) {
          counter.style.color = 'var(--danger-color)';
        } else if (length > maxLength * 0.8) {
          counter.style.color = 'var(--warning-color)';
        } else {
          counter.style.color = 'var(--text-muted)';
        }
      });
      
      descriptionTextarea.setAttribute('maxlength', maxLength);
    }
  }
});

// Export validation functions for use in main popup.js if needed
window.formValidation = {
  validateForm: function() {
    // This function can be called from popup.js
    return true; // Implement actual validation
  },
  resetForm: function() {
    // This function can be called from popup.js
    const form = document.querySelector('#quickAddForm');
    form?.reset();
  }
};
