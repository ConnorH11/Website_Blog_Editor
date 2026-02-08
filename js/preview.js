/**
 * Preview Module
 * Handles live preview rendering using marked.js
 */

const Preview = (function () {
    // DOM Elements
    let previewContent;
    let toggleStyleButton;
    let useConnorStyle = true;

    /**
     * Initialize the preview module
     */
    function init() {
        previewContent = document.getElementById('preview-content');
        toggleStyleButton = document.getElementById('toggle-preview-style');

        if (!previewContent) {
            console.error('Preview: Required elements not found');
            return;
        }

        configureMarked();
        setupEventListeners();
    }

    /**
     * Configure marked.js options
     */
    function configureMarked() {
        if (typeof marked === 'undefined') {
            console.error('Preview: marked.js not loaded');
            return;
        }

        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            highlight: function (code, lang) {
                // Basic syntax highlighting by wrapping in language class
                return `<code class="language-${lang || 'text'}">${escapeHtml(code)}</code>`;
            }
        });
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Listen for editor updates
        document.addEventListener('editor:update', (e) => {
            render(e.detail.content);
        });

        // Toggle preview style button
        if (toggleStyleButton) {
            toggleStyleButton.addEventListener('click', () => {
                useConnorStyle = !useConnorStyle;
                toggleStyleButton.textContent = useConnorStyle ? '🎨' : '📝';
                toggleStyleButton.title = useConnorStyle
                    ? 'Toggle to plain preview'
                    : 'Toggle to connorhorning.com styling';

                // Re-render with new style
                const content = Editor.getContent();
                render(content);
            });
        }
    }

    /**
     * Render markdown content to preview
     * @param {string} markdown - The markdown content to render
     */
    function render(markdown) {
        if (!previewContent) return;

        if (!markdown || markdown.trim() === '') {
            previewContent.innerHTML = '<p class="preview-placeholder">Start typing to see your post preview...</p>';
            return;
        }

        try {
            const html = marked.parse(markdown);
            previewContent.innerHTML = html;

            // Add target="_blank" to external links
            previewContent.querySelectorAll('a').forEach(link => {
                if (link.href && !link.href.startsWith(window.location.origin)) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            });

            // Apply syntax highlighting to code blocks
            if (typeof hljs !== 'undefined') {
                previewContent.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightElement(block);
                });
            }
        } catch (error) {
            console.error('Preview: Error rendering markdown', error);
            previewContent.innerHTML = `<p class="preview-error">Error rendering preview: ${error.message}</p>`;
        }
    }

    /**
     * Get rendered HTML content
     * @returns {string} The rendered HTML
     */
    function getRenderedHtml() {
        return previewContent ? previewContent.innerHTML : '';
    }

    // Public API
    return {
        init,
        render,
        getRenderedHtml
    };
})();
