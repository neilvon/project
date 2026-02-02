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
