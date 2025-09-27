// Safe DOM manipulation utilities to prevent XSS vulnerabilities

/**
 * Creates a DOM element with safe content
 * @param {string} tag - HTML tag name
 * @param {Object} options - Element options
 * @param {string} options.className - CSS classes
 * @param {string} options.textContent - Safe text content
 * @param {Object} options.attributes - Element attributes
 * @param {Array} options.children - Child elements
 * @param {Object} options.style - Inline styles
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.className) {
    element.className = options.className;
  }
  
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options.style) {
    Object.entries(options.style).forEach(([key, value]) => {
      element.style[key] = value;
    });
  }
  
  if (options.children) {
    options.children.forEach(child => {
      if (child) {
        element.appendChild(child instanceof HTMLElement ? child : document.createTextNode(child));
      }
    });
  }
  
  return element;
}

/**
 * Creates an SVG element
 * @param {string} svgString - SVG content as string
 * @returns {SVGElement}
 */
function createSVG(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  return doc.documentElement;
}

/**
 * Safely sets content to an element
 * @param {HTMLElement} element - Target element
 * @param {string|HTMLElement|Array} content - Content to set
 */
function setContent(element, content) {
  // Clear existing content
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  
  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  } else if (Array.isArray(content)) {
    content.forEach(item => {
      if (item instanceof HTMLElement) {
        element.appendChild(item);
      } else if (typeof item === 'string') {
        element.appendChild(document.createTextNode(item));
      }
    });
  }
}

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Creates a loading spinner SVG
 * @param {number} size - Size of the spinner
 * @returns {SVGElement}
 */
function createSpinner(size = 16) {
  return createSVG(`
    <svg class="animate-spin" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  `);
}

/**
 * Creates a safe button with icon and text
 * @param {Object} options - Button options
 * @returns {HTMLElement}
 */
function createButton(options = {}) {
  const button = createElement('button', {
    className: options.className,
    attributes: options.attributes
  });
  
  if (options.icon) {
    button.appendChild(options.icon);
  }
  
  if (options.text) {
    const textNode = document.createTextNode(options.text);
    if (options.icon) {
      const span = createElement('span', {
        style: { marginLeft: '6px' }
      });
      span.appendChild(textNode);
      button.appendChild(span);
    } else {
      button.appendChild(textNode);
    }
  }
  
  if (options.onClick) {
    button.addEventListener('click', options.onClick);
  }
  
  return button;
}

// Export for use in Chrome extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createElement,
    createSVG,
    setContent,
    escapeHtml,
    createSpinner,
    createButton
  };
}
