/**
 * App Module
 * Main application initialization and coordination
 */

(function () {
    'use strict';

    /**
     * Initialize all modules when DOM is ready
     */
    function init() {
        // Initialize modules
        Editor.init();
        Preview.init();
        Export.init();

        // Initialize PDF converter if available
        if (typeof PdfConverter !== 'undefined') {
            PdfConverter.init();
        }

        // Initialize DOCX converter if available
        if (typeof DocxConverter !== 'undefined') {
            DocxConverter.init();
        }

        // Initialize collapse button
        if (typeof Editor !== 'undefined' && Editor.initCollapseButton) {
            Editor.initCollapseButton();
        }

        // Setup post type toggle
        setupPostTypeToggle();

        // Set default date
        setDefaultDate();

        // Initial preview trigger
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('editor:update', {
                detail: { content: '' }
            }));
        }, 100);

        console.log('Blog Editor initialized successfully');
    }

    /**
     * Setup post type toggle to show/hide project-specific fields
     */
    function setupPostTypeToggle() {
        const postTypeSelect = document.getElementById('post-type');
        const coverImageGroup = document.getElementById('cover-image-group');
        const githubUrlGroup = document.getElementById('github-url-group');

        if (!postTypeSelect) return;

        postTypeSelect.addEventListener('change', (e) => {
            const isProject = e.target.value === 'project';

            if (coverImageGroup) {
                coverImageGroup.style.display = isProject ? 'block' : 'none';
            }
            if (githubUrlGroup) {
                githubUrlGroup.style.display = isProject ? 'block' : 'none';
            }
        });
    }

    /**
     * Set default date to current month/year
     */
    function setDefaultDate() {
        const dateInput = document.getElementById('post-date');
        if (dateInput && !dateInput.value) {
            const now = new Date();
            const month = now.toLocaleString('en-US', { month: 'short' });
            const year = now.getFullYear();
            dateInput.value = `${month} ${year}`;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
