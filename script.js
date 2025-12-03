// script.js – Enhanced Study Buddy Core JavaScript

// ============================================
// State Management
// ============================================
const AppState = {
  theme: 'light',
  menuOpen: false,
  isScrolled: false,
  preferences: {},
  
  init() {
    this.loadPreferences();
    this.applyTheme();
  },
  
  loadPreferences() {
    try {
      const saved = localStorage.getItem('studyBuddyPrefs');
      this.preferences = saved ? JSON.parse(saved) : {};
      this.theme = this.preferences.theme || 'light';
    } catch (e) {
      console.warn('Could not load preferences');
    }
  },
  
  savePreferences() {
    try {
      this.preferences.theme = this.theme;
      localStorage.setItem('studyBuddyPrefs', JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('Could not save preferences');
    }
  },
  
  applyTheme() {
    document.body.classList.toggle('dark-mode', this.theme === 'dark');
    this.updateThemeIcon();
  },
  
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.savePreferences();
    this.announceThemeChange();
  },
  
  updateThemeIcon() {
    const toggle = document.getElementById('dark-toggle');
    if (toggle) {
      toggle.textContent = this.theme === 'dark' ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', 
        `Switch to ${this.theme === 'dark' ? 'light' : 'dark'} mode`
      );
    }
  },
  
  announceThemeChange() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Switched to ${this.theme} mode`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
};

// ============================================
// Navigation Controller
// ============================================
const Navigation = {
  init() {
    this.menuToggle = document.getElementById('menu-toggle');
    this.menu = document.getElementById('menu');
    this.header = document.querySelector('.site-header');
    
    if (this.menuToggle && this.menu) {
      this.setupMobileMenu();
    }
    
    this.setupScrollBehavior();
    this.setupSmoothScroll();
    this.highlightActiveNav();
  },
  
  setupMobileMenu() {
    this.menuToggle.addEventListener('click', () => this.toggleMenu());
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (AppState.menuOpen && 
          !this.menu.contains(e.target) && 
          !this.menuToggle.contains(e.target)) {
        this.closeMenu();
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && AppState.menuOpen) {
        this.closeMenu();
        this.menuToggle.focus();
      }
    });
    
    // Close menu when navigating
    this.menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
  },
  
  toggleMenu() {
    AppState.menuOpen = !AppState.menuOpen;
    this.menu.classList.toggle('show', AppState.menuOpen);
    this.menuToggle.setAttribute('aria-expanded', AppState.menuOpen);
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = AppState.menuOpen ? 'hidden' : '';
  },
  
  closeMenu() {
    AppState.menuOpen = false;
    this.menu.classList.remove('show');
    this.menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  },
  
  setupScrollBehavior() {
    let lastScroll = 0;
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.handleScroll(lastScroll);
          lastScroll = window.pageYOffset;
          ticking = false;
        });
        ticking = true;
      }
    });
  },
  
  handleScroll(lastScroll) {
    const currentScroll = window.pageYOffset;
    
    // Add shadow to header when scrolled
    if (this.header) {
      if (currentScroll > 10 && !AppState.isScrolled) {
        AppState.isScrolled = true;
        this.header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
      } else if (currentScroll <= 10 && AppState.isScrolled) {
        AppState.isScrolled = false;
        this.header.style.boxShadow = 'none';
      }
    }
    
    // Auto-hide header on scroll down (optional enhancement)
    if (currentScroll > lastScroll && currentScroll > 100) {
      this.header?.style.setProperty('transform', 'translateY(-100%)');
    } else {
      this.header?.style.setProperty('transform', 'translateY(0)');
    }
  },
  
  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },
  
  highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-menu a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === 'index.html' && href === '/')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }
};

// ============================================
// Animation Controller
// ============================================
const Animations = {
  init() {
    this.setupIntersectionObserver();
    this.setupCardAnimations();
    this.setupCounterAnimations();
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
    
    // Observe all cards and sections
    document.querySelectorAll('.card, .feature-card, section').forEach(el => {
      observer.observe(el);
    });
  },
  
  setupCardAnimations() {
    document.querySelectorAll('.card, .feature-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });
    });
  },
  
  setupCounterAnimations() {
    const counters = document.querySelectorAll('[data-count]');
    
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-count'));
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const updateCounter = () => {
              current += step;
              if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
              } else {
                counter.textContent = target;
              }
            };
            updateCounter();
            observer.unobserve(counter);
          }
        });
      });
      
      observer.observe(counter);
    });
  }
};

// ============================================
// Form Enhancement
// ============================================
const FormHandler = {
  init() {
    this.setupForms();
  },
  
  setupForms() {
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => this.handleSubmit(e, form));
      
      // Real-time validation
      form.querySelectorAll('input, textarea').forEach(field => {
        field.addEventListener('blur', () => this.validateField(field));
        field.addEventListener('input', () => {
          if (field.classList.contains('invalid')) {
            this.validateField(field);
          }
        });
      });
    });
  },
  
  validateField(field) {
    const isValid = field.checkValidity();
    field.classList.toggle('invalid', !isValid);
    field.classList.toggle('valid', isValid);
    
    // Show/hide error message
    let errorMsg = field.parentElement.querySelector('.error-message');
    if (!isValid) {
      if (!errorMsg) {
        errorMsg = document.createElement('span');
        errorMsg.className = 'error-message';
        errorMsg.setAttribute('role', 'alert');
        field.parentElement.appendChild(errorMsg);
      }
      errorMsg.textContent = field.validationMessage;
    } else if (errorMsg) {
      errorMsg.remove();
    }
    
    return isValid;
  },
  
  handleSubmit(e, form) {
    e.preventDefault();
    
    // Validate all fields
    let isValid = true;
    form.querySelectorAll('input, textarea').forEach(field => {
      if (!this.validateField(field)) isValid = false;
    });
    
    if (isValid) {
      this.submitForm(form);
    }
  },
  
  submitForm(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Simulate form submission (replace with actual endpoint)
    setTimeout(() => {
      submitBtn.textContent = '✓ Submitted!';
      form.reset();
      
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }, 2000);
    }, 1000);
  }
};

// ============================================
// Utility Functions
// ============================================
const Utils = {
  init() {
    this.updateDynamicContent();
    this.setupDataTargets();
    this.setupTooltips();
    this.setupBackToTop();
  },
  
  updateDynamicContent() {
    // Update year
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
    
    // Update greeting based on time
    const greetings = document.querySelectorAll('[data-greeting]');
    greetings.forEach(el => {
      const hour = new Date().getHours();
      let greeting = 'Hello';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 18) greeting = 'Good afternoon';
      else greeting = 'Good evening';
      el.textContent = greeting;
    });
  },
  
  setupDataTargets() {
    document.querySelectorAll('[data-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        if (target) {
          window.location.href = `${target}.html`;
        }
      });
    });
  },
  
  setupTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = el.getAttribute('data-tooltip');
      el.style.position = 'relative';
      el.appendChild(tooltip);
      
      el.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
      });
      
      el.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
      });
    });
  },
  
  setupBackToTop() {
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '↑';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    });
    
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

// ============================================
// Performance Optimization
// ============================================
const Performance = {
  init() {
    this.lazyLoadImages();
    this.prefetchLinks();
  },
  
  lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  },
  
  prefetchLinks() {
    const links = document.querySelectorAll('a[href$=".html"]');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        const prefetch = document.createElement('link');
        prefetch.rel = 'prefetch';
        prefetch.href = link.href;
        document.head.appendChild(prefetch);
      }, { once: true });
    });
  }
};

// ============================================
// Enhanced Dark Mode Styles
// ============================================
const style = document.createElement('style');
style.textContent = `
  body.dark-mode {
    background: #0d1117;
    color: #e6edf3;
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  body.dark-mode .card,
  body.dark-mode .feature-card {
    background: #161b22;
    color: #e6edf3;
    border-color: #30363d;
  }
  
  body.dark-mode a {
    color: #93c5fd;
  }
  
  body.dark-mode a:hover {
    color: #60a5fa;
  }
  
  body.dark-mode .site-header {
    background: linear-gradient(90deg, #1f2937, #111827);
    border-bottom: 1px solid #30363d;
  }
  
  body.dark-mode .btn-primary {
    background: #2563eb;
    color: white;
  }
  
  body.dark-mode .btn-primary:hover {
    background: #1d4ed8;
  }
  
  body.dark-mode input,
  body.dark-mode textarea,
  body.dark-mode select {
    background: #0d1117;
    color: #e6edf3;
    border-color: #30363d;
  }
  
  body.dark-mode input:focus,
  body.dark-mode textarea:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
  }
  
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
  
  .site-header {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .card, .feature-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }
  
  input.invalid,
  textarea.invalid {
    border-color: #ef4444;
  }
  
  input.valid,
  textarea.valid {
    border-color: #10b981;
  }
  
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease;
    pointer-events: none;
    margin-bottom: 0.5rem;
  }
  
  .back-to-top {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: #2563eb;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.2s ease;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    z-index: 1000;
  }
  
  .back-to-top.visible {
    opacity: 1;
    visibility: visible;
  }
  
  .back-to-top:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
document.head.appendChild(style);

// ============================================
// Initialize Everything
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
  Navigation.init();
  Animations.init();
  FormHandler.init();
  Utils.init();
  Performance.init();
  
  // Setup theme toggle
  const darkToggle = document.getElementById('dark-toggle');
  if (darkToggle) {
    darkToggle.addEventListener('click', () => AppState.toggleTheme());
  }
  
  console.log('Study Buddy initialized successfully ✨');
});
// ============================================
// Search Functionality
// ============================================
const SearchHandler = {
  searchInput: null,
  searchClear: null,
  searchResults: null,
  searchData: [],
  
  init() {
    this.searchInput = document.getElementById('searchBar');
    this.searchClear = document.getElementById('search-clear');
    
    if (!this.searchInput) {
      console.log('Search input not found on this page');
      return;
    }
    
    console.log('Search initialized');
    this.loadSearchData();
    this.setupSearch();
  },
  
  setupSearch() {
    console.log('Setting up search handlers');
    
    // Real-time search as user types
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      console.log('Search input:', query);
      this.handleSearch(query);
      if (this.searchClear) {
        this.searchClear.style.display = query ? 'block' : 'none';
      }
    });
    
    // Enter key to navigate to first result OR search
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = this.searchInput.value.trim();
        console.log('Enter pressed with query:', query);
        
        if (query) {
          const results = this.searchContent(query);
          console.log('Search results:', results);
          
          if (results.length > 0) {
            // Navigate to the first (best) result
            console.log('Navigating to:', results[0].page);
            window.location.href = results[0].page;
          } else {
            // Show no results message if not already shown
            this.handleSearch(query);
          }
        }
      }
    });
    
    // Clear button
    if (this.searchClear) {
      this.searchClear.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchInput.focus();
        this.clearSearch();
        this.searchClear.style.display = 'none';
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput.focus();
      }
      // Escape to clear
      if (e.key === 'Escape' && document.activeElement === this.searchInput) {
        this.searchInput.blur();
        if (this.searchInput.value) {
          this.searchInput.value = '';
          this.clearSearch();
          if (this.searchClear) {
            this.searchClear.style.display = 'none';
          }
        }
      }
    });
  },
  
  loadSearchData() {
    // All searchable content from the site
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
      { title: 'Digital Literacy', description: 'Learn Google Suite Excel and Canva basics', category: 'Senior High', page: 'seniorhigh.html', keywords: ['technology', 'digital', 'tools', 'google', 'excel', 'canva'] },
      { title: 'Portfolio Building', description: 'Compile best works certificates and achievements', category: 'Senior High', page: 'seniorhigh.html', keywords: ['portfolio', 'achievements', 'career'] },
      
      // University
      { title: 'Research Databases', description: 'Master JSTOR Google Scholar and library access', category: 'University', page: 'university.html', keywords: ['research', 'academic', 'databases', 'jstor', 'scholar'] },
      { title: 'Citation Managers', description: 'Use Zotero Mendeley or EndNote for references', category: 'University', page: 'university.html', keywords: ['citations', 'references', 'zotero', 'mendeley'] },
      { title: 'Critical Reading', description: 'Evaluate sources analyze arguments identify biases', category: 'University', page: 'university.html', keywords: ['reading', 'analysis', 'critical thinking'] },
      { title: 'Thesis Planning', description: 'Outline research chapters early with timeline', category: 'University', page: 'university.html', keywords: ['thesis', 'research', 'planning', 'writing'] },
      { title: 'Academic Balance', description: 'Combine mental breaks with focused study sessions', category: 'University', page: 'university.html', keywords: ['balance', 'wellness', 'breaks', 'pomodoro'] }
    ];
  },
  
  handleSearch(query) {
    if (!query) {
      this.clearSearch();
      return;
    }
    
    const results = this.searchContent(query);
    this.displayResults(results, query);
  },
  
  searchContent(query) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return this.searchData
      .map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const descLower = item.description.toLowerCase();
        const keywordsLower = item.keywords.join(' ').toLowerCase();
        
        searchTerms.forEach(term => {
          // Exact title match - highest score
          if (titleLower === term) score += 100;
          // Title contains term
          else if (titleLower.includes(term)) score += 50;
          // Description contains term
          if (descLower.includes(term)) score += 30;
          // Keywords contain term
          if (keywordsLower.includes(term)) score += 20;
          // Category match
          if (item.category.toLowerCase().includes(term)) score += 15;
        });
        
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 results
  },
  
  displayResults(results, query) {
    // Remove existing results
    this.clearSearch();
    
    if (results.length === 0) {
      this.showNoResults(query);
      return;
    }
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    resultsContainer.setAttribute('role', 'region');
    resultsContainer.setAttribute('aria-label', 'Search results');
    
    // Results header
    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.innerHTML = `
      <h3>Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${this.escapeHtml(query)}"</h3>
      <button class="search-close" aria-label="Close search results">✕</button>
    `;
    resultsContainer.appendChild(header);
    
    // Results list
    const list = document.createElement('div');
    list.className = 'search-results-list';
    
    results.forEach((result, index) => {
      const resultItem = document.createElement('a');
      resultItem.href = result.page;
      resultItem.className = 'search-result-item';
      resultItem.innerHTML = `
        <div class="search-result-category">${result.category}</div>
        <div class="search-result-title">${this.highlightText(result.title, query)}</div>
        <div class="search-result-description">${this.highlightText(result.description, query)}</div>
      `;
      
      // Add animation delay
      resultItem.style.animationDelay = `${index * 0.05}s`;
      
      list.appendChild(resultItem);
    });
    
    resultsContainer.appendChild(list);
    
    // Insert after search wrapper
    const searchWrapper = document.querySelector('.search-wrapper');
    searchWrapper.after(resultsContainer);
    
    // Close button handler
    header.querySelector('.search-close').addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch();
      this.searchClear.style.display = 'none';
    });
    
    // Announce to screen readers
    this.announceResults(results.length);
    
    this.searchResults = resultsContainer;
  },
  
  showNoResults(query) {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results search-no-results';
    resultsContainer.innerHTML = `
      <div class="search-results-header">
        <h3>No results found for "${this.escapeHtml(query)}"</h3>
        <button class="search-close" aria-label="Close search results">✕</button>
      </div>
      <div class="search-no-results-content">
        <p>Try different keywords or browse our study tips by level:</p>
        <div class="search-suggestions">
          <a href="elementary.html" class="search-suggestion">Elementary</a>
          <a href="highschool.html" class="search-suggestion">High School</a>
          <a href="seniorhigh.html" class="search-suggestion">Senior High</a>
          <a href="university.html" class="search-suggestion">University</a>
        </div>
      </div>
    `;
    
    const searchWrapper = document.querySelector('.search-wrapper');
    searchWrapper.after(resultsContainer);
    
    resultsContainer.querySelector('.search-close').addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch();
      this.searchClear.style.display = 'none';
    });
    
    this.searchResults = resultsContainer;
  },
  
  clearSearch() {
    if (this.searchResults) {
      this.searchResults.remove();
      this.searchResults = null;
    }
  },
  
  highlightText(text, query) {
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlighted = this.escapeHtml(text);
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  announceResults(count) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Found ${count} result${count !== 1 ? 's' : ''}`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }
};

// ============================================
// Utility Functions
// ============================================
const Utils = {
  init() {
    this.updateDynamicContent();
    this.setupDataTargets();
    this.setupTooltips();
    this.setupBackToTop();
  },