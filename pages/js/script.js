// script.js – Enhanced Study Buddy Core JavaScript
// Version 3.0 - With Working Dark Mode & Enhanced Features

// ============================================
// Configuration
// ============================================
const Config = {
  ANIMATION_DURATION: 300,
  SCROLL_THRESHOLD: 10,
  HEADER_HIDE_THRESHOLD: 100,
  COUNTER_DURATION: 2000,
  DEBOUNCE_DELAY: 150,
  SEARCH_RESULT_LIMIT: 10,
  STORAGE_KEY: 'studyBuddyPrefs'
};

// ============================================
// Utility Helpers
// ============================================
const Helpers = {
  /**
   * Debounce function execution
   */
  debounce(fn, delay = Config.DEBOUNCE_DELAY) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Throttle function execution using requestAnimationFrame
   */
  throttleRAF(fn) {
    let ticking = false;
    return (...args) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          fn.apply(this, args);
          ticking = false;
        });
        ticking = true;
      }
    };
  },

  /**
   * Safely query DOM element
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  },

  /**
   * Safely query all DOM elements
   */
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Create element with attributes
   */
  createElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'innerHTML') {
        el.innerHTML = value;
      } else if (key.startsWith('data')) {
        el.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });

    return el;
  },

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    const announcement = this.createElement('div', {
      role: 'status',
      'aria-live': priority,
      className: 'sr-only',
      textContent: message
    });
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
};

// ============================================
// Dark Mode Controller - FULLY WORKING
// ============================================
const DarkMode = {
  theme: 'light',
  storageKey: 'studyBuddy_theme',

  init() {
    this.loadTheme();
    this.applyTheme();
    this.setupToggle();
    this.setupSystemThemeListener();
  },

  loadTheme() {
    // Check localStorage first
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme) {
      this.theme = savedTheme;
    } else {
      // Check system preference
      this.theme = this.getSystemTheme();
    }
  },

  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  applyTheme() {
    const html = document.documentElement;
    const body = document.body;

    if (this.theme === 'dark') {
      html.classList.add('dark');
      body.classList.add('dark-mode');
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark-mode');
    }

    this.updateToggleButton();
  },

  setupToggle() {
    const darkToggle = Helpers.$('#dark-toggle');
    if (!darkToggle) return;

    darkToggle.addEventListener('click', () => {
      this.toggleTheme();
    });
  },

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveTheme();
    Helpers.announce(`Switched to ${this.theme} mode`);
  },

  saveTheme() {
    try {
      localStorage.setItem(this.storageKey, this.theme);
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  },

  updateToggleButton() {
    const darkToggle = Helpers.$('#dark-toggle');
    if (!darkToggle) return;

    darkToggle.textContent = this.theme === 'dark' ? '☀️' : '🌙';
    darkToggle.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} mode`);
    darkToggle.setAttribute('aria-pressed', this.theme === 'dark');
  },

  setupSystemThemeListener() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(this.storageKey)) {
        this.theme = e.matches ? 'dark' : 'light';
        this.applyTheme();
      }
    });
  }
};

// ============================================
// State Management
// ============================================
const AppState = {
  menuOpen: false,
  isScrolled: false,
  preferences: {},
  listeners: new Map(),

  init() {
    this.loadPreferences();
  },

  loadPreferences() {
    try {
      const saved = localStorage.getItem(Config.STORAGE_KEY);
      this.preferences = saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Could not load preferences:', e.message);
      this.preferences = {};
    }
  },

  savePreferences() {
    try {
      localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Could not save preferences:', e.message);
    }
  }
};

// ============================================
// Navigation Controller
// ============================================
const Navigation = {
  elements: {},
  lastScrollY: 0,
  abortController: null,

  init() {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.elements = {
      menuToggle: Helpers.$('#menu-toggle'),
      menu: Helpers.$('#menu'),
      header: Helpers.$('.site-header')
    };

    if (this.elements.menuToggle && this.elements.menu) {
      this.setupMobileMenu(signal);
    }

    this.setupScrollBehavior(signal);
    this.setupSmoothScroll(signal);
    this.highlightActiveNav();
  },

  setupMobileMenu(signal) {
    const { menuToggle, menu } = this.elements;

    menuToggle.addEventListener('click', () => this.toggleMenu(), { signal });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (AppState.menuOpen && !menu.contains(e.target) && !menuToggle.contains(e.target)) {
        this.closeMenu();
      }
    }, { signal });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && AppState.menuOpen) {
        this.closeMenu();
        menuToggle.focus();
      }
    }, { signal });

    // Close menu when navigating
    Helpers.$$('a', menu).forEach(link => {
      link.addEventListener('click', () => this.closeMenu(), { signal });
    });
  },

  toggleMenu() {
    AppState.menuOpen = !AppState.menuOpen;
    const { menu, menuToggle } = this.elements;

    menu.classList.toggle('active', AppState.menuOpen);
    menuToggle.setAttribute('aria-expanded', String(AppState.menuOpen));
    document.body.style.overflow = AppState.menuOpen ? 'hidden' : '';

    if (AppState.menuOpen) {
      const firstLink = Helpers.$('a', menu);
      firstLink?.focus();
    }
  },

  closeMenu() {
    if (!AppState.menuOpen) return;

    AppState.menuOpen = false;
    const { menu, menuToggle } = this.elements;

    menu.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  },

  setupScrollBehavior(signal) {
    const handleScroll = Helpers.throttleRAF(() => {
      this.handleScroll();
    });

    window.addEventListener('scroll', handleScroll, { passive: true, signal });
  },

  handleScroll() {
    const currentScrollY = window.scrollY;
    const { header } = this.elements;

    if (!header) return;

    // Add shadow to header when scrolled
    const shouldHaveShadow = currentScrollY > Config.SCROLL_THRESHOLD;
    if (shouldHaveShadow !== AppState.isScrolled) {
      AppState.isScrolled = shouldHaveShadow;
      header.classList.toggle('scrolled', shouldHaveShadow);
    }

    // Auto-hide header on scroll down (optional)
    const shouldHide = currentScrollY > this.lastScrollY && currentScrollY > Config.HEADER_HIDE_THRESHOLD;
    header.classList.toggle('hidden', shouldHide);

    this.lastScrollY = currentScrollY;
  },

  setupSmoothScroll(signal) {
    Helpers.$$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#' || href === '#main-content') return;

        const target = Helpers.$(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Update URL without triggering scroll
          history.pushState(null, '', href);
          
          // Focus target for accessibility
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      }, { signal });
    });
  },

  highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    Helpers.$$('.menu-list a, .nav-menu a').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === currentPage || (currentPage === '' && href === 'index.html');

      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  },

  destroy() {
    this.abortController?.abort();
  }
};

// ============================================
// Animation Controller - ENHANCED
// ============================================
const Animations = {
  observers: [],

  init() {
    if (this.prefersReducedMotion()) {
      return;
    }

    this.setupIntersectionObserver();
    this.setupCardAnimations();
    this.setupCounterAnimations();
    this.setupParallaxEffects();
  },

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-color-scheme: reduce)').matches;
  },

  setupIntersectionObserver() {
    const options = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, options);

    this.observers.push(observer);

    // Observe cards and sections
    Helpers.$$('.card, .resource-card, section[data-animate]').forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = `opacity 0.6s ease ${index * 0.05}s, transform 0.6s ease ${index * 0.05}s`;
      observer.observe(el);
    });
  },

  setupCardAnimations() {
    Helpers.$$('.card, .resource-card').forEach(card => {
      // Enhanced hover effect
      card.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      });

      card.addEventListener('mouseleave', function() {
        this.style.transition = 'all 0.3s ease';
      });

      // Add ripple effect on click
      card.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
      });
    });
  },

  setupCounterAnimations() {
    const counters = Helpers.$$('[data-count]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    this.observers.push(observer);
    counters.forEach(counter => observer.observe(counter));
  },

  animateCounter(counter) {
    const target = parseInt(counter.getAttribute('data-count'), 10);
    const duration = Config.COUNTER_DURATION;
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad for smoother animation
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(easeProgress * target);

      counter.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString();
      }
    };

    requestAnimationFrame(updateCounter);
  },

  setupParallaxEffects() {
    let ticking = false;
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
      lastScrollY = window.pageYOffset;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const cards = Helpers.$$('.card');
          cards.forEach((card, index) => {
            const speed = 0.2 + (index % 4) * 0.05;
            const yPos = -(lastScrollY * speed * 0.01);
            card.style.transform = `translateY(${yPos}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
};

// ============================================
// Form Enhancement
// ============================================
const FormHandler = {
  forms: new WeakMap(),

  init() {
    this.setupForms();
  },

  setupForms() {
    Helpers.$$('form').forEach(form => {
      if (this.forms.has(form)) return;

      const controller = new AbortController();
      this.forms.set(form, controller);

      const { signal } = controller;

      form.addEventListener('submit', (e) => this.handleSubmit(e, form), { signal });
      form.setAttribute('novalidate', '');

      Helpers.$$('input, textarea, select', form).forEach(field => {
        field.addEventListener('blur', () => this.validateField(field), { signal });
        field.addEventListener('input', Helpers.debounce(() => {
          if (field.classList.contains('invalid')) {
            this.validateField(field);
          }
        }), { signal });
      });
    });
  },

  validateField(field) {
    const isValid = field.checkValidity();

    field.classList.toggle('invalid', !isValid);
    field.classList.toggle('valid', isValid);
    field.setAttribute('aria-invalid', String(!isValid));

    const errorId = `${field.id || field.name}-error`;
    let errorMsg = Helpers.$(`#${errorId}`);

    if (!isValid) {
      if (!errorMsg) {
        errorMsg = Helpers.createElement('span', {
          id: errorId,
          className: 'error-message',
          role: 'alert',
          'aria-live': 'polite'
        });
        field.parentElement.appendChild(errorMsg);
        field.setAttribute('aria-describedby', errorId);
      }
      errorMsg.textContent = this.getCustomErrorMessage(field);
    } else {
      errorMsg?.remove();
      field.removeAttribute('aria-describedby');
    }

    return isValid;
  },

  getCustomErrorMessage(field) {
    const validity = field.validity;

    if (validity.valueMissing) {
      return `${field.labels?.[0]?.textContent || 'This field'} is required`;
    }
    if (validity.typeMismatch) {
      if (field.type === 'email') return 'Please enter a valid email address';
      if (field.type === 'url') return 'Please enter a valid URL';
    }
    if (validity.tooShort) {
      return `Please enter at least ${field.minLength} characters`;
    }
    if (validity.tooLong) {
      return `Please enter no more than ${field.maxLength} characters`;
    }
    if (validity.patternMismatch) {
      return field.title || 'Please match the requested format';
    }

    return field.validationMessage;
  },

  handleSubmit(e, form) {
    e.preventDefault();

    const fields = Helpers.$$('input, textarea, select', form);
    let firstInvalid = null;

    fields.forEach(field => {
      if (!this.validateField(field) && !firstInvalid) {
        firstInvalid = field;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      Helpers.announce('Please fix the errors in the form', 'assertive');
      return;
    }

    this.submitForm(form);
  },

  async submitForm(form) {
    const submitBtn = Helpers.$('button[type="submit"]', form);
    if (!submitBtn) return;

    const originalContent = submitBtn.innerHTML;
    const originalDisabled = submitBtn.disabled;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

      // Simulate API call - replace with actual fetch
      await new Promise(resolve => setTimeout(resolve, 1000));

      submitBtn.innerHTML = '✓ Submitted!';
      submitBtn.classList.add('success');
      form.reset();

      // Reset field states
      Helpers.$$('input, textarea, select', form).forEach(field => {
        field.classList.remove('valid', 'invalid');
        field.removeAttribute('aria-invalid');
      });

      Helpers.announce('Form submitted successfully');

      setTimeout(() => {
        submitBtn.innerHTML = originalContent;
        submitBtn.classList.remove('success');
        submitBtn.disabled = originalDisabled;
      }, 2000);

    } catch (error) {
      submitBtn.innerHTML = '✕ Error';
      submitBtn.classList.add('error');
      Helpers.announce('Form submission failed. Please try again.', 'assertive');

      setTimeout(() => {
        submitBtn.innerHTML = originalContent;
        submitBtn.classList.remove('error');
        submitBtn.disabled = originalDisabled;
      }, 2000);
    }
  }
};

// ============================================
// Search Functionality
// ============================================
const SearchHandler = {
  elements: {},
  searchData: [],
  abortController: null,

  init() {
    this.elements = {
      input: Helpers.$('#searchBar'),
      clear: Helpers.$('#search-clear'),
      wrapper: Helpers.$('.search-wrapper')
    };

    if (!this.elements.input) return;

    this.abortController = new AbortController();
    this.loadSearchData();
    this.setupSearch();
  },

  loadSearchData() {
    this.searchData = [
      // Elementary
      { title: 'Sing & Rhyme', description: 'Turn lessons into songs to improve retention and make learning fun', category: 'Elementary', page: 'elementary.html', keywords: ['music', 'memory', 'songs', 'retention'] },
      { title: 'Colorful Flashcards', description: 'Use colors and images for vocabulary and facts', category: 'Elementary', page: 'elementary.html', keywords: ['visual', 'memory', 'colors', 'vocabulary'] },
      { title: 'Short Sessions', description: 'Study for 15-25 minutes then take breaks', category: 'Elementary', page: 'elementary.html', keywords: ['focus', 'breaks', 'time management'] },
      { title: 'Read Aloud', description: 'Reading aloud helps comprehension and memory', category: 'Elementary', page: 'elementary.html', keywords: ['reading', 'comprehension'] },

      // High School
      { title: 'Cornell Notes', description: 'Organize lectures into cues, notes, and summaries', category: 'High School', page: 'highschool.html', keywords: ['notes', 'organization', 'lectures', 'review'] },
      { title: 'Mnemonics', description: 'Use memory devices for sequences like PEMDAS', category: 'High School', page: 'highschool.html', keywords: ['memory', 'tricks', 'sequences'] },
      { title: 'Mind Maps', description: 'Connect ideas visually to improve understanding', category: 'High School', page: 'highschool.html', keywords: ['visual', 'connections', 'diagrams'] },
      { title: 'Pomodoro Technique', description: 'Study for 25 minutes then 5-minute break', category: 'High School', page: 'highschool.html', keywords: ['focus', 'timer', 'productivity', 'breaks'] },
      { title: 'Flashcard Apps', description: 'Use Anki or Quizlet for spaced repetition', category: 'High School', page: 'highschool.html', keywords: ['apps', 'technology', 'spaced repetition', 'anki', 'quizlet'] },
      { title: 'Study Groups', description: 'Explain concepts to peers to deepen comprehension', category: 'High School', page: 'highschool.html', keywords: ['collaboration', 'peers', 'teaching'] },
      { title: 'Past Papers', description: 'Practice with old exam formats under timed conditions', category: 'High School', page: 'highschool.html', keywords: ['practice', 'exams', 'testing'] },

      // Senior High
      { title: 'Career Mapping', description: 'Identify pathways early using interest inventories', category: 'Senior High', page: 'seniorhigh.html', keywords: ['career', 'planning', 'future'] },
      { title: 'Time Blocking', description: 'Plan fixed hours for subjects and rest', category: 'Senior High', page: 'seniorhigh.html', keywords: ['schedule', 'time management', 'planning'] },
      { title: 'Mock Interviews', description: 'Practice responses with peers for confidence', category: 'Senior High', page: 'seniorhigh.html', keywords: ['interview', 'practice', 'career'] },
      { title: 'Digital Literacy', description: 'Learn Google Suite, Excel, and Canva basics', category: 'Senior High', page: 'seniorhigh.html', keywords: ['technology', 'digital', 'tools', 'google', 'excel', 'canva'] },
      { title: 'Portfolio Building', description: 'Compile best works, certificates, and achievements', category: 'Senior High', page: 'seniorhigh.html', keywords: ['portfolio', 'achievements', 'career'] },

      // University
      { title: 'Research Databases', description: 'Master JSTOR, Google Scholar, and library access', category: 'University', page: 'university.html', keywords: ['research', 'academic', 'databases', 'jstor', 'scholar'] },
      { title: 'Citation Managers', description: 'Use Zotero, Mendeley, or EndNote for references', category: 'University', page: 'university.html', keywords: ['citations', 'references', 'zotero', 'mendeley'] },
      { title: 'Critical Reading', description: 'Evaluate sources, analyze arguments, identify biases', category: 'University', page: 'university.html', keywords: ['reading', 'analysis', 'critical thinking'] },
      { title: 'Thesis Planning', description: 'Outline research chapters early with timeline', category: 'University', page: 'university.html', keywords: ['thesis', 'research', 'planning', 'writing'] },
      { title: 'Academic Balance', description: 'Combine mental breaks with focused study sessions', category: 'University', page: 'university.html', keywords: ['balance', 'wellness', 'breaks', 'pomodoro'] }
    ];
  },

  setupSearch() {
    const { input, clear, wrapper } = this.elements;
    const { signal } = this.abortController;

    // Debounced search as user types
    const debouncedSearch = Helpers.debounce((query) => {
      this.handleSearch(query);
    }, 200);

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedSearch(query);
      if (clear) {
        clear.style.display = query ? 'flex' : 'none';
      }
    }, { signal });

    // Enter key to navigate to first result
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = input.value.trim();

        if (query) {
          const results = this.searchContent(query);
          if (results.length > 0) {
            window.location.href = results[0].page;
          }
        }
      }

      // Arrow key navigation in results
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this.handleArrowNavigation(e);
      }
    }, { signal });

    // Clear button
    clear?.addEventListener('click', () => {
      input.value = '';
      input.focus();
      this.clearResults();
      clear.style.display = 'none';
    }, { signal });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }

      if (e.key === 'Escape' && document.activeElement === input) {
        input.blur();
        this.clearResults();
      }
    }, { signal });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
      if (!wrapper?.contains(e.target) && !this.elements.resultsContainer?.contains(e.target)) {
        this.clearResults();
      }
    }, { signal });
  },

  handleArrowNavigation(e) {
    const results = Helpers.$$('.search-result-item');
    if (results.length === 0) return;

    e.preventDefault();
    const currentIndex = results.findIndex(r => r === document.activeElement);

    let nextIndex;
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    }

    results[nextIndex]?.focus();
  },

  handleSearch(query) {
    if (!query) {
      this.clearResults();
      return;
    }

    const results = this.searchContent(query);
    this.displayResults(results, query);
  },

  searchContent(query) {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);

    if (searchTerms.length === 0) return [];

    return this.searchData
      .map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const descLower = item.description.toLowerCase();
        const keywordsLower = item.keywords.join(' ').toLowerCase();
        const categoryLower = item.category.toLowerCase();

        searchTerms.forEach(term => {
          if (titleLower === term) score += 100;
          else if (titleLower.startsWith(term)) score += 75;
          else if (titleLower.includes(term)) score += 50;

          if (descLower.includes(term)) score += 30;
          if (keywordsLower.includes(term)) score += 25;
          if (categoryLower.includes(term)) score += 15;
        });

        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Config.SEARCH_RESULT_LIMIT);
  },

  displayResults(results, query) {
    this.clearResults();

    const container = Helpers.createElement('div', {
      className: 'search-results',
      role: 'listbox',
      'aria-label': 'Search results'
    });

    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-no-results">
          <p>No results found for "<strong>${Helpers.escapeHtml(query)}</strong>"</p>
          <p class="search-suggestions-text">Try different keywords or browse by level:</p>
          <div class="search-suggestions">
            <a href="elementary.html">Elementary</a>
            <a href="highschool.html">High School</a>
            <a href="seniorhigh.html">Senior High</a>
            <a href="university.html">University</a>
          </div>
        </div>
      `;
    } else {
      const header = Helpers.createElement('div', {
        className: 'search-results-header',
        innerHTML: `<span>${results.length} result${results.length !== 1 ? 's' : ''}</span>`
      });
      container.appendChild(header);

      results.forEach((result, index) => {
        const item = Helpers.createElement('a', {
          href: result.page,
          className: 'search-result-item',
          role: 'option',
          'aria-selected': 'false'
        });

        item.innerHTML = `
          <span class="search-result-category">${result.category}</span>
          <span class="search-result-title">${this.highlightText(result.title, query)}</span>
          <span class="search-result-description">${this.highlightText(result.description, query)}</span>
        `;

        item.style.animationDelay = `${index * 30}ms`;
        container.appendChild(item);
      });
    }

    this.elements.wrapper?.appendChild(container);
    this.elements.resultsContainer = container;

    Helpers.announce(`${results.length} result${results.length !== 1 ? 's' : ''} found`);
  },

  highlightText(text, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    let highlighted = Helpers.escapeHtml(text);

    terms.forEach(term => {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  },

  clearResults() {
    this.elements.resultsContainer?.remove();
    this.elements.resultsContainer = null;
  },

  destroy() {
    this.abortController?.abort();
    this.clearResults();
  }
};

// ============================================
// Utility Functions (Combined)
// ============================================
const Utils = {
  backToTopBtn: null,

  init() {
    this.updateDynamicContent();
    this.setupDataTargets();
    this.setupTooltips();
    this.setupBackToTop();
  },

  updateDynamicContent() {
    // Update year
    const yearSpan = Helpers.$('#year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }

    // Update greeting based on time
    Helpers.$$('[data-greeting]').forEach(el => {
      const hour = new Date().getHours();
      let greeting;
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 18) greeting = 'Good afternoon';
      else greeting = 'Good evening';
      el.textContent = greeting;
    });
  },

  setupDataTargets() {
    Helpers.$$('[data-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target) {
          window.location.href = `${target}.html`;
        }
      });
    });
  },

  setupTooltips() {
    Helpers.$$('[data-tooltip]').forEach(el => {
      const tooltipText = el.getAttribute('data-tooltip');
      const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

      const tooltip = Helpers.createElement('span', {
        id: tooltipId,
        className: 'tooltip',
        role: 'tooltip',
        textContent: tooltipText
      });

      el.style.position = 'relative';
      el.setAttribute('aria-describedby', tooltipId);
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => {
        tooltip.classList.add('visible');
      });

      el.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      el.addEventListener('focus', () => {
        tooltip.classList.add('visible');
      });

      el.addEventListener('blur', () => {
        tooltip.classList.remove('visible');
      });
    });
  },

  setupBackToTop() {
    this.backToTopBtn = Helpers.createElement('button', {
      className: 'back-to-top',
      'aria-label': 'Back to top',
      innerHTML: '↑'
    });

    document.body.appendChild(this.backToTopBtn);

    const handleScroll = Helpers.throttleRAF(() => {
      const shouldShow = window.scrollY > 300;
      this.backToTopBtn.classList.toggle('visible', shouldShow);
    });

    window.addEventListener('scroll', handleScroll, { passive: true });

    this.backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focus first focusable element for accessibility
      Helpers.$('a, button, input, [tabindex]')?.focus();
    });
  }
};

// ============================================
// Performance Optimization
// ============================================
const Performance = {
  imageObserver: null,

  init() {
    this.lazyLoadImages();
    this.prefetchLinks();
  },

  lazyLoadImages() {
    const images = Helpers.$$('img[data-src]');
    if (images.length === 0) return;

    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading supported
      images.forEach(img => {
        img.src = img.getAttribute('data-src');
        img.loading = 'lazy';
        img.removeAttribute('data-src');
      });
    } else {
      // Fallback to IntersectionObserver
      this.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
            this.imageObserver.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });

      images.forEach(img => this.imageObserver.observe(img));
    }
  },

  prefetchLinks() {
    if (!('IntersectionObserver' in window)) return;

    const prefetched = new Set();

    Helpers.$$('a[href$=".html"]').forEach(link => {
      link.addEventListener('mouseenter', () => {
        const href = link.href;
        if (prefetched.has(href)) return;

        const prefetch = Helpers.createElement('link', {
          rel: 'prefetch',
          href: href
        });
        document.head.appendChild(prefetch);
        prefetched.add(href);
      }, { once: true });
    });
  },

  destroy() {
    this.imageObserver?.disconnect();
  }
};

// ============================================
// Styles (Injected)
// ============================================
const injectStyles = () => {
  // Check if styles already exist
  if (Helpers.$('#study-buddy-dynamic-styles')) return;

  const style = document.createElement('style');
  style.id = 'study-buddy-dynamic-styles';
  style.textContent = `
    /* Ripple Effect */
    .ripple-effect {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transform: translate(-50%, -50%);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
    }

    @keyframes ripple {
      to {
        width: 200px;
        height: 200px;
        opacity: 0;
      }
    }

    /* Enhanced Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Form States */
    .error-message {
      color: var(--color-error, #ef4444);
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    input.invalid,
    textarea.invalid {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    input.valid,
    textarea.valid {
      border-color: var(--color-success, #10b981);
    }

    /* Back to Top */
    .back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--accent-1, #2563eb);
      color: white;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
    }

    .back-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .back-to-top:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    /* Search Results */
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--card, white);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 0.5rem;
      margin-top: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      max-height: 400px;
      overflow-y: auto;
      z-index: 100;
    }

    .search-results-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border, #e5e7eb);
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .search-result-item {
      display: block;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: var(--text, #1a1a2e);
      border-bottom: 1px solid var(--border, #e5e7eb);
      transition: background-color 0.15s ease;
      animation: slideIn 0.3s ease forwards;
      opacity: 0;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .search-result-item:hover,
    .search-result-item:focus {
      background: var(--hover-bg, #f3f4f6);
      outline: none;
    }

    .search-result-category {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--accent-1, #2563eb);
      color: white;
      border-radius: 9999px;
      margin-bottom: 0.25rem;
    }

    .search-result-title {
      display: block;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .search-result-description {
      display: block;
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .search-result-item mark {
      background: rgba(37, 99, 235, 0.2);
      color: inherit;
      padding: 0 2px;
      border-radius: 2px;
    }

    .search-no-results {
      padding: 1.5rem;
      text-align: center;
    }

    .search-suggestions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .search-suggestions a {
      padding: 0.5rem 1rem;
      background: var(--border, #e5e7eb);
      border-radius: 9999px;
      text-decoration: none;
      color: var(--text, #1a1a2e);
      font-size: 0.875rem;
      transition: background-color 0.15s ease;
    }

    .search-suggestions a:hover {
      background: var(--accent-1, #2563eb);
      color: white;
    }

    /* Tooltips */
    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: var(--text, #1a1a2e);
      color: var(--bg, white);
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
      z-index: 1000;
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--text, #1a1a2e);
    }

    .tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    /* Screen Reader Only */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Focus Visible */
    :focus-visible {
      outline: 2px solid var(--accent-2, #f59e0b);
      outline-offset: 2px;
    }

    :focus:not(:focus-visible) {
      outline: none;
    }
  `;

  document.head.appendChild(style);
};

// ============================================
// Initialize Application
// ============================================
const App = {
  initialized: false,

  init() {
    if (this.initialized) return;

    // Inject dynamic styles
    injectStyles();

    // Initialize all modules
    AppState.init();
    DarkMode.init(); // DARK MODE INITIALIZATION
    Navigation.init();
    Animations.init();
    FormHandler.init();
    SearchHandler.init();
    Utils.init();
    Performance.init();

    this.initialized = true;
    console.log('✨ Study Buddy initialized with dark mode support!');
  },

  destroy() {
    Navigation.destroy();
    Animations.destroy();
    SearchHandler.destroy();
    Performance.destroy();
    this.initialized = false;
  }
};

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { App, DarkMode, AppState, Navigation, SearchHandler, Helpers };
}
// ============================================
// Styles (Injected)
// ============================================
const injectStyles = () => {
  // Check if styles already exist
  if (Helpers.$('#study-buddy-dynamic-styles')) return;

  const style = document.createElement('style');
  style.id = 'study-buddy-dynamic-styles';
  style.textContent = `
    /* Fix search wrapper z-index */
    .search-wrapper {
      position: relative;
      z-index: 200 !important;
    }

    /* Ripple Effect */
    .ripple-effect {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transform: translate(-50%, -50%);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1;
    }

    @keyframes ripple {
      to {
        width: 200px;
        height: 200px;
        opacity: 0;
      }
    }

    /* Enhanced Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Form States */
    .error-message {
      color: var(--color-error, #ef4444);
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    input.invalid,
    textarea.invalid {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    input.valid,
    textarea.valid {
      border-color: var(--color-success, #10b981);
    }

    /* Back to Top */
    .back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--accent-1, #2563eb);
      color: white;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999;
    }

    .back-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .back-to-top:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    /* Search Results - FIXED Z-INDEX */
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--card, white);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 0.5rem;
      margin-top: 0.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-height: 400px;
      overflow-y: auto;
      z-index: 9999 !important;
    }

    /* Dark mode search results */
    .dark .search-results,
    html.dark .search-results {
      background: var(--card, #1e293b);
      border-color: var(--border, #30363d);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    }

    .search-results-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border, #e5e7eb);
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .search-result-item {
      display: block;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: var(--text, #1a1a2e);
      border-bottom: 1px solid var(--border, #e5e7eb);
      transition: background-color 0.15s ease;
      animation: slideIn 0.3s ease forwards;
      opacity: 0;
      position: relative;
      z-index: 1;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .search-result-item:last-child {
      border-bottom: none;
    }

    .search-result-item:hover,
    .search-result-item:focus {
      background: var(--hover-bg, #f3f4f6);
      outline: none;
    }

    /* Dark mode search items */
    .dark .search-result-item,
    html.dark .search-result-item {
      color: var(--text, #e6edf3);
      border-bottom-color: var(--border, #30363d);
    }

    .dark .search-result-item:hover,
    html.dark .search-result-item:hover,
    .dark .search-result-item:focus,
    html.dark .search-result-item:focus {
      background: rgba(255, 255, 255, 0.05);
    }

    .search-result-category {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--accent-1, #2563eb);
      color: white;
      border-radius: 9999px;
      margin-bottom: 0.25rem;
    }

    .search-result-title {
      display: block;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .search-result-description {
      display: block;
      font-size: 0.875rem;
      opacity: 0.7;
    }

    .search-result-item mark {
      background: rgba(37, 99, 235, 0.2);
      color: inherit;
      padding: 0 2px;
      border-radius: 2px;
    }

    .dark .search-result-item mark,
    html.dark .search-result-item mark {
      background: rgba(88, 166, 255, 0.3);
    }

    .search-no-results {
      padding: 1.5rem;
      text-align: center;
    }

    .search-suggestions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-top: 1rem;
      flex-wrap: wrap;
    }

    .search-suggestions a {
      padding: 0.5rem 1rem;
      background: var(--border, #e5e7eb);
      border-radius: 9999px;
      text-decoration: none;
      color: var(--text, #1a1a2e);
      font-size: 0.875rem;
      transition: background-color 0.15s ease;
    }

    .search-suggestions a:hover {
      background: var(--accent-1, #2563eb);
      color: white;
    }

    .dark .search-suggestions a,
    html.dark .search-suggestions a {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text, #e6edf3);
    }

    /* Tooltips */
    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: var(--text, #1a1a2e);
      color: var(--bg, white);
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
      z-index: 10000;
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-top-color: var(--text, #1a1a2e);
    }

    .tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    /* Screen Reader Only */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Focus Visible */
    :focus-visible {
      outline: 2px solid var(--accent-2, #f59e0b);
      outline-offset: 2px;
    }

    :focus:not(:focus-visible) {
      outline: none;
    }

    /* Additional fixes for stacking context */
    .site-header {
      z-index: 100;
    }

    .main-nav {
      position: relative;
      z-index: 150;
    }

    /* Ensure search is above everything except modals */
    #searchBar {
      position: relative;
      z-index: 1;
    }
  `;

  document.head.appendChild(style);
};

