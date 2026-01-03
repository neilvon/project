
// script.js – Enhanced Study Buddy Core JavaScript
// Version 2.0 - Optimized & Bug-Fixed

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
// State Management
// ============================================
const AppState = {
  theme: 'light',
  menuOpen: false,
  isScrolled: false,
  preferences: {},
  listeners: new Map(),

  init() {
    this.loadPreferences();
    this.applyTheme();
    this.setupSystemThemeListener();
  },

  loadPreferences() {
    try {
      const saved = localStorage.getItem(Config.STORAGE_KEY);
      this.preferences = saved ? JSON.parse(saved) : {};
      this.theme = this.preferences.theme || this.getSystemTheme();
    } catch (e) {
      console.warn('Could not load preferences:', e.message);
      this.preferences = {};
    }
  },

  savePreferences() {
    try {
      this.preferences.theme = this.theme;
      localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Could not save preferences:', e.message);
    }
  },

  getSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setupSystemThemeListener() {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mediaQuery && !this.preferences.theme) {
      mediaQuery.addEventListener('change', (e) => {
        if (!this.preferences.theme) {
          this.theme = e.matches ? 'dark' : 'light';
          this.applyTheme();
        }
      });
    }
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    document.body.classList.toggle('dark-mode', this.theme === 'dark');
    this.updateThemeIcon();
  },

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.savePreferences();
    Helpers.announce(`Switched to ${this.theme} mode`);
  },

  updateThemeIcon() {
    const toggle = Helpers.$('#dark-toggle');
    if (toggle) {
      toggle.textContent = this.theme === 'dark' ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} mode`);
      toggle.setAttribute('aria-pressed', this.theme === 'dark');
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

    // Close menu when navigating and trap focus
    Helpers.$$('a', menu).forEach(link => {
      link.addEventListener('click', () => this.closeMenu(), { signal });
    });

    // Trap focus within menu when open
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && AppState.menuOpen) {
        this.handleFocusTrap(e);
      }
    }, { signal });
  },

  handleFocusTrap(e) {
    const { menu, menuToggle } = this.elements;
    const focusableElements = Helpers.$$('a, button', menu);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      menuToggle.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      menuToggle.focus();
    }
  },

  toggleMenu() {
    AppState.menuOpen = !AppState.menuOpen;
    const { menu, menuToggle } = this.elements;

    menu.classList.toggle('show', AppState.menuOpen);
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

    menu.classList.remove('show');
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

    // Auto-hide header on scroll down
    const shouldHide = currentScrollY > this.lastScrollY && currentScrollY > Config.HEADER_HIDE_THRESHOLD;
    header.classList.toggle('hidden', shouldHide);

    this.lastScrollY = currentScrollY;
  },

  setupSmoothScroll(signal) {
    Helpers.$$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;

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

    Helpers.$$('.nav-menu a').forEach(link => {
      const href = link.getAttribute('href');
      const isActive = href === currentPage || (currentPage === 'index.html' && href === '/');

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
// Animation Controller
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
  },

  prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
          entry.target.classList.add('fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, options);

    this.observers.push(observer);

    Helpers.$$('.card, .feature-card, section[data-animate]').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  },

  setupCardAnimations() {
    Helpers.$$('.card, .feature-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
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
  const style = document.createElement('style');
  style.id = 'study-buddy-styles';
  style.textContent = `
    /* Theme Variables */
    :root {
      --color-bg: #ffffff;
      --color-text: #1a1a2e;
      --color-primary: #2563eb;
      --color-primary-hover: #1d4ed8;
      --color-card-bg: #ffffff;
      --color-border: #e5e7eb;
      --color-error: #ef4444;
      --color-success: #10b981;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
      --transition-fast: 150ms ease;
      --transition-normal: 300ms ease;
    }

    [data-theme="dark"],
    body.dark-mode {
      --color-bg: #0d1117;
      --color-text: #e6edf3;
      --color-primary: #58a6ff;
      --color-primary-hover: #79b8ff;
      --color-card-bg: #161b22;
      --color-border: #30363d;
    }

    /* Base Transitions */
    body {
      background-color: var(--color-bg);
      color: var(--color-text);
      transition: background-color var(--transition-normal), color var(--transition-normal);
    }

    /* Header States */
    .site-header {
      transition: transform var(--transition-normal), box-shadow var(--transition-normal);
    }

    .site-header.scrolled {
      box-shadow: var(--shadow-md);
    }

    .site-header.hidden {
      transform: translateY(-100%);
    }

    /* Cards */
    .card,
    .feature-card {
      background: var(--color-card-bg);
      border: 1px solid var(--color-border);
      transition: transform var(--transition-normal), box-shadow var(--transition-normal);
    }

    .card:hover,
    .feature-card:hover {
      box-shadow: var(--shadow-lg);
    }

    /* Form States */
    .error-message {
      color: var(--color-error);
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    input.invalid,
    textarea.invalid {
      border-color: var(--color-error);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    input.valid,
    textarea.valid {
      border-color: var(--color-success);
    }

    /* Animations */
    .fade-in-up {
      animation: fadeInUp 0.6s ease forwards;
    }

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

    /* Tooltips */
    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: var(--color-text);
      color: var(--color-bg);
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity var(--transition-fast), transform var(--transition-fast);
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
      border-top-color: var(--color-text);
    }

    .tooltip.visible {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    /* Back to Top */
    .back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: opacity var(--transition-normal), visibility var(--transition-normal), 
                  transform var(--transition-normal), background-color var(--transition-fast);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
    }

    .back-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .back-to-top:hover {
      background: var(--color-primary-hover);
      transform: translateY(-3px);
    }

    .back-to-top:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* Search Results */
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-card-bg);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      margin-top: 0.5rem;
      box-shadow: var(--shadow-lg);
      max-height: 400px;
      overflow-y: auto;
      z-index: 100;
    }

    .search-results-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
      color: var(--color-text);
      opacity: 0.7;
    }

    .search-result-item {
      display: block;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: var(--color-text);
      border-bottom: 1px solid var(--color-border);
      transition: background-color var(--transition-fast);
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

    .search-result-item:last-child {
      border-bottom: none;
    }

    .search-result-item:hover,
    .search-result-item:focus {
      background: var(--color-border);
      outline: none;
    }

    .search-result-category {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: var(--color-primary);
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
      background: var(--color-border);
      border-radius: 9999px;
      text-decoration: none;
      color: var(--color-text);
      font-size: 0.875rem;
      transition: background-color var(--transition-fast);
    }

    .search-suggestions a:hover {
      background: var(--color-primary);
      color: white;
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
      outline: 2px solid var(--color-primary);
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

    injectStyles();

    AppState.init();
    Navigation.init();
    Animations.init();
    FormHandler.init();
    SearchHandler.init();
    Utils.init();
    Performance.init();

    // Setup theme toggle
    const darkToggle = Helpers.$('#dark-toggle');
    darkToggle?.addEventListener('click', () => AppState.toggleTheme());

    this.initialized = true;
    console.log('Study Buddy initialized ✨');
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
  module.exports = { App, AppState, Navigation, SearchHandler, Helpers };
}
