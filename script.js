/**
 * Meridian Medical Group - Professional Medical Website
 * Main JavaScript Module
 * Handles: Navigation, Forms, Animations, Toast Notifications, Interactions
 */

(function() {
  'use strict';

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  };

  const throttle = (fn, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================

  class ToastManager {
    constructor() {
      this.container = $('#toast-container');
      this.toasts = new Map();
      this.idCounter = 0;
    }

    show(message, type = 'info', duration = 5000) {
      const id = ++this.idCounter;
      const toast = this.createToast(id, message, type);
      this.container.appendChild(toast);
      this.toasts.set(id, toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
      });

      // Auto-remove
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration);
      }

      return id;
    }

    createToast(id, message, type) {
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.dataset.toastId = id;
      toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${this.getIcon(type)}
        </svg>
        <span class="toast-message">${this.escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Dismiss notification">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      toast.querySelector('.toast-close').addEventListener('click', () => this.remove(id));
      return toast;
    }

    getIcon(type) {
      const icons = {
        success: '<polyline points="20 6 9 17 4 12"/>',
        error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
      };
      return icons[type] || icons.info;
    }

    remove(id) {
      const toast = this.toasts.get(id);
      if (toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
          toast.remove();
          this.toasts.delete(id);
        }, 300);
      }
    }

    success(message, duration) {
      return this.show(message, 'success', duration);
    }

    error(message, duration) {
      return this.show(message, 'error', duration);
    }

    warning(message, duration) {
      return this.show(message, 'warning', duration);
    }

    info(message, duration) {
      return this.show(message, 'info', duration);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // ==========================================================================
  // Form Validation & Handling
  // ==========================================================================

  class FormValidator {
    constructor(form) {
      this.form = form;
      this.fields = new Map();
      this.init();
    }

    init() {
      const inputs = this.form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type === 'hidden') return;
        this.fields.set(input.name, input);
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', () => this.clearError(input));
      });
    }

    validateField(field) {
      const errorEl = field.parentElement.querySelector('.form-error');
      let isValid = true;
      let message = '';

      // Required check
      if (field.required && !field.value.trim()) {
        isValid = false;
        message = `${this.getFieldLabel(field)} is required`;
      }

      // Email validation
      if (isValid && field.type === 'email' && field.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
          isValid = false;
          message = 'Please enter a valid email address';
        }
      }

      // Phone validation
      if (isValid && field.type === 'tel' && field.value) {
        const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
        if (!phoneRegex.test(field.value.replace(/\s/g, ''))) {
          isValid = false;
          message = 'Please enter a valid phone number';
        }
      }

      // Date validation (not in past for preferred date)
      if (isValid && field.type === 'date' && field.value && field.name === 'preferred_date') {
        const selected = new Date(field.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
          isValid = false;
          message = 'Please select a future date';
        }
      }

      // Date of birth validation (not in future, reasonable age)
      if (isValid && field.type === 'date' && field.value && field.name === 'dob') {
        const dob = new Date(field.value);
        const today = new Date();
        if (dob > today) {
          isValid = false;
          message = 'Date of birth cannot be in the future';
        } else {
          const age = today.getFullYear() - dob.getFullYear();
          if (age > 120) {
            isValid = false;
            message = 'Please enter a valid date of birth';
          }
        }
      }

      // Min/Max date attributes
      if (isValid && field.type === 'date' && field.value) {
        if (field.min && new Date(field.value) < new Date(field.min)) {
          isValid = false;
          message = `Date must be on or after ${formatDate(field.min)}`;
        }
        if (field.max && new Date(field.value) > new Date(field.max)) {
          isValid = false;
          message = `Date must be on or before ${formatDate(field.max)}`;
        }
      }

      if (!isValid) {
        this.showError(field, message);
      } else {
        this.clearError(field);
      }

      return isValid;
    }

    showError(field, message) {
      field.setAttribute('aria-invalid', 'true');
      const errorEl = field.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.textContent = message;
      }
      field.parentElement.classList.add('has-error');
    }

    clearError(field) {
      field.removeAttribute('aria-invalid');
      const errorEl = field.parentElement.querySelector('.form-error');
      if (errorEl) {
        errorEl.textContent = '';
      }
      field.parentElement.classList.remove('has-error');
    }

    getFieldLabel(field) {
      const label = this.form.querySelector(`label[for="${field.id}"]`);
      return label ? label.textContent.replace('*', '').trim() : field.name;
    }

    validateAll() {
      let isValid = true;
      this.fields.forEach((field, name) => {
        if (!this.validateField(field)) {
          isValid = false;
        }
      });
      return isValid;
    }

    getFormData() {
      const data = new FormData(this.form);
      const obj = {};
      for (const [key, value] of data.entries()) {
        if (obj[key]) {
          if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
          obj[key].push(value);
        } else {
          obj[key] = value;
        }
      }
      return obj;
    }

    reset() {
      this.form.reset();
      this.fields.forEach(field => this.clearError(field));
    }
  }

  // ==========================================================================
  // Appointment Booking Form
  // ==========================================================================

  class BookingForm {
    constructor(form, toast) {
      this.form = form;
      this.toast = toast;
      this.validator = new FormValidator(form);
      this.isSubmitting = false;
      this.init();
    }

    init() {
      // Set minimum date for preferred date to tomorrow
      const preferredDate = this.form.querySelector('#preferred-date');
      if (preferredDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        preferredDate.min = tomorrow.toISOString().split('T')[0];
      }

      // Set max date for DOB (120 years ago)
      const dob = this.form.querySelector('#dob');
      if (dob) {
        const maxDob = new Date();
        maxDob.setFullYear(maxDob.getFullYear() - 120);
        dob.max = maxDob.toISOString().split('T')[0];
      }

      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
      e.preventDefault();

      if (this.isSubmitting) return;

      if (!this.validator.validateAll()) {
        this.toast.error('Please fix the errors above and try again');
        return;
      }

      this.isSubmitting = true;
      const submitBtn = this.form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      try {
        // Simulate API call
        await this.simulateSubmission();

        const formData = this.validator.getFormData();
        this.showConfirmation(formData);

        this.validator.reset();
        this.toast.success('Appointment request submitted! We\'ll contact you within 24 hours to confirm.');
      } catch (error) {
        this.toast.error('Something went wrong. Please try again or call us directly.');
        console.error('Booking submission error:', error);
      } finally {
        this.isSubmitting = false;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }

    simulateSubmission() {
      return new Promise(resolve => setTimeout(resolve, 1500));
    }

    showConfirmation(data) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button class="modal-close" aria-label="Close confirmation">&times;</button>
          <div class="modal-content">
            <div class="modal-icon success" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 id="modal-title">Request Submitted!</h2>
            <p>Thank you, ${this.escapeHtml(data.first_name)}. We've received your appointment request.</p>
            <div class="modal-details">
              <h4>Request Summary</h4>
              <dl>
                <dt>Visit Type</dt><dd>${this.formatVisitType(data.visit_type)}</dd>
                <dt>Preferred Provider</dt><dd>${this.formatProvider(data.provider)}</dd>
                <dt>Preferred Date</dt><dd>${data.preferred_date ? formatDate(data.preferred_date) : 'Any available'}</dd>
                <dt>Contact</dt><dd>${this.escapeHtml(data.email)} • ${this.escapeHtml(data.phone)}</dd>
                <dt>Insurance</dt><dd>${this.formatInsurance(data.insurance)}</dd>
              </dl>
            </div>
            <p class="modal-note">Our scheduling team will call you at <strong>${this.escapeHtml(data.phone)}</strong> within 24 hours to confirm your appointment time.</p>
            <button class="btn btn--primary modal-close-btn">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
      };

      modal.querySelector('.modal-close').addEventListener('click', closeModal);
      modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      // Focus management
      const closeBtn = modal.querySelector('.modal-close');
      closeBtn.focus();

      // Trap focus
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Tab') {
          const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    formatVisitType(type) {
      const types = {
        'new-patient': 'New Patient Visit',
        'follow-up': 'Follow-up Appointment',
        'annual': 'Annual Physical / Wellness',
        'acute': 'Acute / Sick Visit',
        'video': 'Telehealth / Video Visit'
      };
      return types[type] || type;
    }

    formatProvider(provider) {
      const providers = {
        'dr-mitchell': 'Dr. Sarah Mitchell (Family Medicine)',
        'dr-chen': 'Dr. James Chen (Cardiology)',
        'dr-rodriguez': 'Dr. Maria Rodriguez (Pediatrics)',
        'dr-thompson': 'Dr. Michael Thompson (Internal Medicine)'
      };
      return providers[provider] || 'Any available doctor';
    }

    formatInsurance(insurance) {
      const plans = {
        'blue-cross': 'Blue Cross Blue Shield',
        'aetna': 'Aetna',
        'cigna': 'Cigna',
        'united': 'UnitedHealthcare',
        'medicare': 'Medicare',
        'medicaid': 'Medicaid',
        'other': 'Other / Self-pay'
      };
      return plans[insurance] || 'Not specified';
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // ==========================================================================
  // Contact Form
  // ==========================================================================

  class ContactForm {
    constructor(form, toast) {
      this.form = form;
      this.toast = toast;
      this.validator = new FormValidator(form);
      this.isSubmitting = false;
      this.init();
    }

    init() {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
      e.preventDefault();

      if (this.isSubmitting) return;

      if (!this.validator.validateAll()) {
        this.toast.error('Please fix the errors above and try again');
        return;
      }

      this.isSubmitting = true;
      const submitBtn = this.form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        await this.simulateSubmission();
        this.validator.reset();
        this.toast.success('Message sent successfully! We\'ll get back to you within 1 business day.');
      } catch (error) {
        this.toast.error('Failed to send message. Please try again or call us directly.');
        console.error('Contact submission error:', error);
      } finally {
        this.isSubmitting = false;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }

    simulateSubmission() {
      return new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ==========================================================================
  // Counter Animation
  // ==========================================================================

  class CounterAnimation {
    constructor() {
      this.counters = $$('[data-count]');
      this.animated = new WeakSet();
      this.init();
    }

    init() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !this.animated.has(entry.target)) {
              this.animate(entry.target);
              this.animated.add(entry.target);
            }
          });
        }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });

        this.counters.forEach(counter => this.observer.observe(counter));
      } else {
        // Fallback for older browsers
        this.counters.forEach(counter => this.animate(counter));
      }
    }

    animate(element) {
      const target = parseInt(element.dataset.count, 10);
      const duration = 2000;
      const startTime = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = target.toLocaleString();
        }
      };

      requestAnimationFrame(update);
    }
  }

  // ==========================================================================
  // Mobile Navigation
  // ==========================================================================

  class MobileNavigation {
    constructor() {
      this.toggle = $('.nav-toggle');
      this.menu = $('.nav-menu');
      this.links = $$('.nav-link', this.menu);
      this.isOpen = false;
      this.init();
    }

    init() {
      if (!this.toggle || !this.menu) return;

      this.toggle.addEventListener('click', () => this.toggleMenu());
      this.links.forEach(link => {
        link.addEventListener('click', () => this.closeMenu());
      });

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.closeMenu();
        }
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.menu.contains(e.target) && !this.toggle.contains(e.target)) {
          this.closeMenu();
        }
      });
    }

    toggleMenu() {
      this.isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
      this.isOpen = true;
      this.menu.classList.add('active');
      this.toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      // Focus first link
      const firstLink = this.menu.querySelector('.nav-link');
      if (firstLink) firstLink.focus();
    }

    closeMenu() {
      this.isOpen = false;
      this.menu.classList.remove('active');
      this.toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      this.toggle.focus();
    }
  }

  // ==========================================================================
  // Smooth Scroll
  // ==========================================================================

  class SmoothScroll {
    constructor() {
      this.init();
    }

    init() {
      $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          if (targetId === '#') return;

          const target = $(targetId);
          if (target) {
            e.preventDefault();
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });

            // Update URL without scrolling
            history.pushState(null, '', targetId);

            // Focus target for accessibility
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        });
      });
    }
  }

  // ==========================================================================
  // Scroll Animations (Intersection Observer)
  // ==========================================================================

  class ScrollAnimations {
    constructor() {
      this.elements = $$('.service-card, .doctor-card, .location-card, .value, .stat');
      this.init();
    }

    init() {
      if (!('IntersectionObserver' in window)) {
        this.elements.forEach(el => el.classList.add('animate-in'));
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      this.elements.forEach(el => this.observer.observe(el));
    }
  }

  // ==========================================================================
  // Header Scroll Effect
  // ==========================================================================

  class HeaderScrollEffect {
    constructor() {
      this.header = $('.header');
      this.lastScroll = 0;
      this.init();
    }

    init() {
      if (!this.header) return;

      window.addEventListener('scroll', throttle(() => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
          this.header.classList.add('header--scrolled');
        } else {
          this.header.classList.remove('header--scrolled');
        }

        // Hide/show header on scroll
        if (currentScroll > this.lastScroll && currentScroll > 200) {
          this.header.classList.add('header--hidden');
        } else {
          this.header.classList.remove('header--hidden');
        }

        this.lastScroll = currentScroll;
      }, 100));
    }
  }

  // ==========================================================================
  // Patient Portal Login Modal (Demo)
  // ==========================================================================

  class PortalLogin {
    constructor() {
      this.init();
    }

    init() {
      // Handle "Access Patient Portal" button clicks
      $$('a[href="#portal-login"], a[href="#portal"]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.showLoginModal();
        });
      });
    }

    showLoginModal() {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
          <button class="modal-close" aria-label="Close portal login">&times;</button>
          <div class="modal-content">
            <div class="modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 id="portal-modal-title">Patient Portal Login</h2>
            <p>Access your health records, schedule appointments, and message your care team.</p>
            <form class="portal-login-form" novalidate>
              <div class="form-group">
                <label for="portal-username">Username or Email</label>
                <input type="text" id="portal-username" name="username" required autocomplete="username">
              </div>
              <div class="form-group">
                <label for="portal-password">Password</label>
                <input type="password" id="portal-password" name="password" required autocomplete="current-password">
              </div>
              <div class="form-group form-checkbox">
                <input type="checkbox" id="portal-remember" name="remember">
                <label for="portal-remember">Remember me</label>
              </div>
              <button type="submit" class="btn btn--primary btn--full">Sign In</button>
            </form>
            <div class="modal-links">
              <a href="#">Forgot username?</a>
              <span>·</span>
              <a href="#">Forgot password?</a>
              <span>·</span>
              <a href="#">Enroll now</a>
            </div>
            <p class="modal-note">This is a demo. In production, this would connect to your EHR/Patient Portal system (Epic MyChart, Cerner HealtheLife, Athenahealth, etc.)</p>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
      };

      modal.querySelector('.modal-close').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      const form = modal.querySelector('.portal-login-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = form.querySelector('#portal-username').value;
        this.toast.info(`Demo: Would log in as "${username}". Connect to your EHR system for real authentication.`);
        closeModal();
      });

      // Focus management
      const closeBtn = modal.querySelector('.modal-close');
      closeBtn.focus();

      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
      });
    }
  }

  // ==========================================================================
  // Initialize Everything
  // ==========================================================================

  // Global toast manager
  window.toast = new ToastManager();

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Core components
    new MobileNavigation();
    new SmoothScroll();
    new HeaderScrollEffect();
    new CounterAnimation();
    new ScrollAnimations();
    new PortalLogin();

    // Forms
    const bookingForm = $('#booking-form');
    if (bookingForm) {
      new BookingForm(bookingForm, window.toast);
    }

    const contactForm = $('#contact-form');
    if (contactForm) {
      new ContactForm(contactForm, window.toast);
    }

    // Add scroll animation styles dynamically
    const style = document.createElement('style');
    style.textContent = `
      .service-card,
      .doctor-card,
      .location-card,
      .value,
      .stat {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      .service-card.animate-in,
      .doctor-card.animate-in,
      .location-card.animate-in,
      .value.animate-in,
      .stat.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
      .header--scrolled {
        box-shadow: var(--shadow-md);
      }
      .header--hidden {
        transform: translateY(-100%);
      }
      .header {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
        z-index: var(--z-modal);
        animation: fadeIn 0.2s ease;
      }
      .modal {
        background: var(--color-white);
        border-radius: var(--radius-xl);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        animation: slideUp 0.3s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .modal-close {
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-100);
        border: none;
        border-radius: var(--radius-full);
        font-size: var(--font-size-xl);
        color: var(--color-600);
        cursor: pointer;
        transition: all var(--transition-fast);
        z-index: 1;
      }
      .modal-close:hover {
        background: var(--color-200);
        color: var(--color-900);
      }
      .modal-content {
        padding: var(--space-8);
        text-align: center;
      }
      .modal-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto var(--space-4);
      }
      .modal-icon.success {
        background: var(--color-success-light);
        color: var(--color-success);
      }
      .modal-icon svg {
        width: 32px;
        height: 32px;
      }
      .modal-content h2 {
        margin-bottom: var(--space-2);
      }
      .modal-content > p {
        color: var(--color-600);
        margin-bottom: var(--space-6);
      }
      .modal-details {
        background: var(--color-50);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin: var(--space-6) 0;
        text-align: left;
      }
      .modal-details h4 {
        margin-bottom: var(--space-3);
        font-size: var(--font-size-sm);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-500);
      }
      .modal-details dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--space-2) var(--space-4);
        font-size: var(--font-size-sm);
      }
      .modal-details dt {
        color: var(--color-500);
        font-weight: var(--font-weight-normal);
      }
      .modal-details dd {
        color: var(--color-700);
        font-weight: var(--font-weight-medium);
      }
      .modal-note {
        font-size: var(--font-size-sm);
        color: var(--color-500);
        margin-top: var(--space-4);
      }
      .modal-links {
        display: flex;
        justify-content: center;
        gap: var(--space-2);
        margin: var(--space-4) 0;
        font-size: var(--font-size-sm);
      }
      .modal-links a {
        color: var(--color-primary);
      }
      .modal-links span {
        color: var(--color-400);
      }
      .portal-login-form {
        margin: var(--space-6) 0;
        text-align: left;
      }
      .portal-login-form .form-group {
        margin-bottom: var(--space-4);
      }
      .portal-login-form label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--space-1);
      }
      .portal-login-form input {
        width: 100%;
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-300);
        border-radius: var(--radius-md);
        font-family: var(--font-sans);
        font-size: var(--font-size-base);
      }
      .portal-login-form input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }
      .form-checkbox {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .form-checkbox input {
        width: 18px !important;
        height: 18px !important;
        accent-color: var(--color-primary);
      }
    `;
    document.head.appendChild(style);

    // Announce page load for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'visually-hidden';
    announcement.textContent = 'Meridian Medical Group website loaded';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  });

  // Handle page visibility for animations
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Re-check counters when tab becomes visible
      $$('[data-count]').forEach(counter => {
        if (counter.textContent === '0' || counter.textContent === '') {
          const target = parseInt(counter.dataset.count, 10);
          if (!isNaN(target)) {
            counter.textContent = target.toLocaleString();
          }
        }
      });
    }
  });

})();