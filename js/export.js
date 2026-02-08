/**
 * Export Module
 * Handles HTML generation, file downloads, and snippet copying
 */

const Export = (function () {
    // Cached CSS
    let cachedCss = null;  // Default fallback CSS
    let customCss = null;  // User-uploaded custom CSS
    let customNavbarHtml = null;  // User-uploaded navbar HTML
    let customFooterHtml = null;  // User-uploaded footer HTML
    const CUSTOM_CSS_KEY = 'blog-editor-custom-css';
    const CUSTOM_CSS_FILENAME_KEY = 'blog-editor-custom-css-filename';
    const CUSTOM_NAVBAR_KEY = 'blog-editor-custom-navbar';
    const CUSTOM_NAVBAR_FILENAME_KEY = 'blog-editor-custom-navbar-filename';
    const CUSTOM_FOOTER_KEY = 'blog-editor-custom-footer';
    const CUSTOM_FOOTER_FILENAME_KEY = 'blog-editor-custom-footer-filename';

    // DOM Elements
    let downloadHtmlBtn;
    let downloadMdBtn;
    let copySnippetBtn;
    let snippetModal;
    let closeModalBtn;
    let snippetCode;
    let copySnippetModalBtn;
    let exportFilename;
    let cssUploadBtn;
    let cssUploadInput;
    let cssClearBtn;
    let cssFilenameSpan;
    let useCustomCssCheckbox;
    let includeNavFooterCheckbox;
    let navbarUploadBtn;
    let navbarUploadInput;
    let navbarClearBtn;
    let navbarFilenameSpan;
    let footerUploadBtn;
    let footerUploadInput;
    let footerClearBtn;
    let footerFilenameSpan;

    /**
     * Initialize the export module
     */
    function init() {
        downloadHtmlBtn = document.getElementById('download-html');
        downloadMdBtn = document.getElementById('download-markdown');
        copySnippetBtn = document.getElementById('copy-snippet');
        snippetModal = document.getElementById('snippet-modal');
        closeModalBtn = document.getElementById('close-modal');
        snippetCode = document.getElementById('snippet-code');
        copySnippetModalBtn = document.getElementById('copy-snippet-btn');
        exportFilename = document.getElementById('export-filename');
        cssUploadBtn = document.getElementById('css-upload-btn');
        cssUploadInput = document.getElementById('custom-css-upload');
        cssClearBtn = document.getElementById('css-clear-btn');
        cssFilenameSpan = document.getElementById('css-filename');
        useCustomCssCheckbox = document.getElementById('use-custom-css');
        includeNavFooterCheckbox = document.getElementById('include-navbar-footer');
        navbarUploadBtn = document.getElementById('navbar-upload-btn');
        navbarUploadInput = document.getElementById('custom-navbar-upload');
        navbarClearBtn = document.getElementById('navbar-clear-btn');
        navbarFilenameSpan = document.getElementById('navbar-filename');
        footerUploadBtn = document.getElementById('footer-upload-btn');
        footerUploadInput = document.getElementById('custom-footer-upload');
        footerClearBtn = document.getElementById('footer-clear-btn');
        footerFilenameSpan = document.getElementById('footer-filename');

        setupEventListeners();
        setupFilenameUpdater();
        setupCustomCss();
        loadCustomCss();
        setupCustomNavbar();
        loadCustomNavbar();
        setupCustomFooter();
        loadCustomFooter();
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        if (downloadHtmlBtn) {
            downloadHtmlBtn.addEventListener('click', downloadHtml);
        }

        if (downloadMdBtn) {
            downloadMdBtn.addEventListener('click', downloadMarkdown);
        }

        if (copySnippetBtn) {
            copySnippetBtn.addEventListener('click', showSnippetModal);
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', hideModal);
        }

        if (snippetModal) {
            snippetModal.addEventListener('click', (e) => {
                if (e.target === snippetModal) hideModal();
            });
        }

        if (copySnippetModalBtn) {
            copySnippetModalBtn.addEventListener('click', copySnippetToClipboard);
        }
    }

    /**
     * Set up custom CSS upload functionality
     */
    function setupCustomCss() {
        if (cssUploadBtn && cssUploadInput) {
            cssUploadBtn.addEventListener('click', () => {
                cssUploadInput.click();
            });

            cssUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.name.endsWith('.css')) {
                    uploadCustomCss(file);
                } else {
                    showToast('Please select a valid CSS file', 'error');
                }
            });
        }

        if (cssClearBtn) {
            cssClearBtn.addEventListener('click', clearCustomCss);
        }
    }

    /**
     * Upload and save custom CSS
     * @param {File} file - The CSS file to upload
     */
    function uploadCustomCss(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const cssContent = e.target.result;
            customCss = cssContent;

            // Save to localStorage
            try {
                localStorage.setItem(CUSTOM_CSS_KEY, cssContent);
                localStorage.setItem(CUSTOM_CSS_FILENAME_KEY, file.name);

                // Update UI
                if (cssFilenameSpan) {
                    cssFilenameSpan.textContent = file.name;
                }
                if (cssClearBtn) {
                    cssClearBtn.style.display = 'inline-block';
                }

                showToast(`Custom CSS '${file.name}' loaded successfully`, 'success');
            } catch (error) {
                console.error('Failed to save custom CSS:', error);
                showToast('Failed to save CSS to cache', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Load custom CSS from localStorage
     */
    function loadCustomCss() {
        try {
            const savedCss = localStorage.getItem(CUSTOM_CSS_KEY);
            const savedFilename = localStorage.getItem(CUSTOM_CSS_FILENAME_KEY);

            if (savedCss && savedFilename) {
                customCss = savedCss;

                if (cssFilenameSpan) {
                    cssFilenameSpan.textContent = savedFilename;
                }
                if (cssClearBtn) {
                    cssClearBtn.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Failed to load custom CSS:', error);
        }
    }

    /**
     * Clear custom CSS
     */
    function clearCustomCss() {
        customCss = null;

        try {
            localStorage.removeItem(CUSTOM_CSS_KEY);
            localStorage.removeItem(CUSTOM_CSS_FILENAME_KEY);

            if (cssFilenameSpan) {
                cssFilenameSpan.textContent = '';
            }
            if (cssClearBtn) {
                cssClearBtn.style.display = 'none';
            }
            if (cssUploadInput) {
                cssUploadInput.value = '';
            }

            showToast('Custom CSS removed', 'info');
        } catch (error) {
            console.error('Failed to clear custom CSS:', error);
        }
    }

    /**
     * Set up custom navbar upload functionality
     */
    function setupCustomNavbar() {
        if (navbarUploadBtn && navbarUploadInput) {
            navbarUploadBtn.addEventListener('click', () => {
                navbarUploadInput.click();
            });

            navbarUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.name.endsWith('.html')) {
                    uploadCustomNavbar(file);
                } else {
                    showToast('Please select a valid HTML file', 'error');
                }
            });
        }

        if (navbarClearBtn) {
            navbarClearBtn.addEventListener('click', clearCustomNavbar);
        }
    }

    /**
     * Upload and save custom navbar
     * @param {File} file - The HTML file to upload
     */
    function uploadCustomNavbar(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const htmlContent = e.target.result;
            customNavbarHtml = htmlContent;

            try {
                localStorage.setItem(CUSTOM_NAVBAR_KEY, htmlContent);
                localStorage.setItem(CUSTOM_NAVBAR_FILENAME_KEY, file.name);

                if (navbarFilenameSpan) {
                    navbarFilenameSpan.textContent = file.name;
                }
                if (navbarClearBtn) {
                    navbarClearBtn.style.display = 'inline-block';
                }

                showToast(`Custom navbar '${file.name}' loaded successfully`, 'success');
            } catch (error) {
                console.error('Failed to save custom navbar:', error);
                showToast('Failed to save navbar to cache', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Load custom navbar from localStorage
     */
    function loadCustomNavbar() {
        try {
            const savedHtml = localStorage.getItem(CUSTOM_NAVBAR_KEY);
            const savedFilename = localStorage.getItem(CUSTOM_NAVBAR_FILENAME_KEY);

            if (savedHtml && savedFilename) {
                customNavbarHtml = savedHtml;

                if (navbarFilenameSpan) {
                    navbarFilenameSpan.textContent = savedFilename;
                }
                if (navbarClearBtn) {
                    navbarClearBtn.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Failed to load custom navbar:', error);
        }
    }

    /**
     * Clear custom navbar
     */
    function clearCustomNavbar() {
        customNavbarHtml = null;

        try {
            localStorage.removeItem(CUSTOM_NAVBAR_KEY);
            localStorage.removeItem(CUSTOM_NAVBAR_FILENAME_KEY);

            if (navbarFilenameSpan) {
                navbarFilenameSpan.textContent = '';
            }
            if (navbarClearBtn) {
                navbarClearBtn.style.display = 'none';
            }
            if (navbarUploadInput) {
                navbarUploadInput.value = '';
            }

            showToast('Custom navbar removed', 'info');
        } catch (error) {
            console.error('Failed to clear custom navbar:', error);
        }
    }

    /**
     * Set up custom footer upload functionality
     */
    function setupCustomFooter() {
        if (footerUploadBtn && footerUploadInput) {
            footerUploadBtn.addEventListener('click', () => {
                footerUploadInput.click();
            });

            footerUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.name.endsWith('.html')) {
                    uploadCustomFooter(file);
                } else {
                    showToast('Please select a valid HTML file', 'error');
                }
            });
        }

        if (footerClearBtn) {
            footerClearBtn.addEventListener('click', clearCustomFooter);
        }
    }

    /**
     * Upload and save custom footer
     * @param {File} file - The HTML file to upload
     */
    function uploadCustomFooter(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const htmlContent = e.target.result;
            customFooterHtml = htmlContent;

            try {
                localStorage.setItem(CUSTOM_FOOTER_KEY, htmlContent);
                localStorage.setItem(CUSTOM_FOOTER_FILENAME_KEY, file.name);

                if (footerFilenameSpan) {
                    footerFilenameSpan.textContent = file.name;
                }
                if (footerClearBtn) {
                    footerClearBtn.style.display = 'inline-block';
                }

                showToast(`Custom footer '${file.name}' loaded successfully`, 'success');
            } catch (error) {
                console.error('Failed to save custom footer:', error);
                showToast('Failed to save footer to cache', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Load custom footer from localStorage
     */
    function loadCustomFooter() {
        try {
            const savedHtml = localStorage.getItem(CUSTOM_FOOTER_KEY);
            const savedFilename = localStorage.getItem(CUSTOM_FOOTER_FILENAME_KEY);

            if (savedHtml && savedFilename) {
                customFooterHtml = savedHtml;

                if (footerFilenameSpan) {
                    footerFilenameSpan.textContent = savedFilename;
                }
                if (footerClearBtn) {
                    footerClearBtn.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Failed to load custom footer:', error);
        }
    }

    /**
     * Clear custom footer
     */
    function clearCustomFooter() {
        customFooterHtml = null;

        try {
            localStorage.removeItem(CUSTOM_FOOTER_KEY);
            localStorage.removeItem(CUSTOM_FOOTER_FILENAME_KEY);

            if (footerFilenameSpan) {
                footerFilenameSpan.textContent = '';
            }
            if (footerClearBtn) {
                footerClearBtn.style.display = 'none';
            }
            if (footerUploadInput) {
                footerUploadInput.value = '';
            }

            showToast('Custom footer removed', 'info');
        } catch (error) {
            console.error('Failed to clear custom footer:', error);
        }
    }

    /**
     * Set up filename updater based on title input
     */
    function setupFilenameUpdater() {
        const titleInput = document.getElementById('post-title');
        if (titleInput && exportFilename) {
            titleInput.addEventListener('input', () => {
                const filename = generateFilename(titleInput.value);
                exportFilename.innerHTML = `Filename: <code>${filename}.html</code>`;
            });
        }
    }

    /**
     * Generate a filename from title
     * @param {string} title - The post title
     * @returns {string} A sanitized filename
     */
    function generateFilename(title) {
        if (!title || title.trim() === '') return 'untitled';

        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50) || 'untitled';
    }

    /**
     * Get post metadata from form
     * @returns {Object} Post metadata
     */
    function getMetadata() {
        return {
            title: document.getElementById('post-title')?.value || 'Untitled Post',
            date: document.getElementById('post-date')?.value || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            type: document.getElementById('post-type')?.value || 'article',
            description: document.getElementById('post-description')?.value || '',
            coverImage: document.getElementById('cover-image')?.value || '',
            githubUrl: document.getElementById('github-url')?.value || ''
        };
    }

    /**
     * Fetch CSS - Uses custom CSS if enabled, otherwise minimal fallback
     * @returns {Promise<string>} The CSS content
     */
    async function fetchCss() {
        // Check if custom CSS should be used
        if (useCustomCssCheckbox && useCustomCssCheckbox.checked && customCss) {
            return customCss;
        }

        // Otherwise use minimal fallback CSS
        if (!cachedCss) {
            cachedCss = getFallbackCss();
        }
        return cachedCss;
    }

    /**
     * Get minimal fallback CSS if custom CSS not provided
     * Users are expected to upload their own CSS for full styling
     * @returns {string} Minimal fallback CSS
     */
    function getFallbackCss() {
        return `
/* Minimal Fallback CSS - Upload custom CSS for full styling */
:root {
    --bg-color: #0a192f;
    --text-primary: #ecf0f1;
    --text-secondary: #8892b0;
    --accent: #64ffda;
    --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-heading: 'Playfair Display', Georgia, serif;
    --font-mono: 'Fira Code', 'Courier New', Courier, monospace;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: var(--bg-color);
    color: var(--text-primary);
    font-family: var(--font-body);
    line-height: 1.6;
    padding: 2rem;
}

.content-wrapper, .article-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    color: var(--text-primary);
    margin-top: 2rem;
    margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.5rem; }

p {
    margin-bottom: 1.5rem;
    color: var(--text-secondary);
}

a {
    color: var(--accent);
    text-decoration: underline;
}

ul, ol {
    margin-bottom: 1.5rem;
    padding-left: 2rem;
}

li {
    margin-bottom: 0.5rem;
}

code {
    font-family: var(--font-mono);
    background: rgba(100, 255, 218, 0.1);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
    color: var(--accent);
}

pre {
    background: rgba(0, 0, 0, 0.3);
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5rem 0;
}

pre code {
    background: transparent;
    padding: 0;
    color: #e6f1ff;
}

blockquote {
    border-left: 4px solid var(--accent);
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: var(--text-secondary);
    font-style: italic;
}

hr {
    border: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 2rem 0;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
}

th, td {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem;
    text-align: left;
}

th {
    background: rgba(100, 255, 218, 0.1);
    font-weight: 600;
}

img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.5rem auto;
    border-radius: 8px;
}

/* Basic navbar styling */
.navbar {
    background: rgba(10, 25, 47, 0.9);
    padding: 1rem 2rem;
    margin-bottom: 2rem;
}

.nav-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent);
    text-decoration: none;
}

.nav-link {
    color: var(--text-secondary);
    margin: 0 1rem;
    text-decoration: none;
}

.nav-link:hover {
    color: var(--accent);
}
        `;
    }

    /**
     * Generate full HTML document
     * @returns {Promise<string>} Complete HTML document
     */
    async function generateHtml() {
        const metadata = getMetadata();
        const markdown = Editor.getContent();
        const renderedContent = marked.parse(markdown);
        const css = await fetchCss();
        const isProject = metadata.type === 'project';
        const relativePath = isProject ? '../' : '../';
        const includeNavFooter = includeNavFooterCheckbox && includeNavFooterCheckbox.checked;

        const githubButton = metadata.githubUrl
            ? `<a href="${metadata.githubUrl}" target="_blank" rel="noopener noreferrer" class="github-link">View on GitHub</a>`
            : '';

        /**
         * Get default navbar HTML
         */
        function getDefaultNavbar() {
            return `
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="https://connorhorning.com/index.html#home" class="logo">CH.</a>

            <div class="desktop-menu">
                <a href="https://connorhorning.com/index.html#home" class="nav-link">Home</a>
                <a href="https://connorhorning.com/index.html#projects" class="nav-link">Projects</a>
                <a href="https://connorhorning.com/index.html#articles" class="nav-link">Articles</a>
                <a href="https://connorhorning.com/index.html#experience" class="nav-link">Resume</a>
                <a href="https://connorhorning.com/index.html#about" class="nav-link">About</a>
                <a href="https://connorhorning.com/index.html#contact" class="nav-link">Contact</a>
            </div>

            <div class="mobile-toggle" id="mobile-toggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>
`;
        }

        /**
         * Get default footer HTML
         */
        function getDefaultFooter() {
            return `
    <!-- Footer -->
    <footer>
        <div class="content-wrapper">
            <p style="text-align:center; padding: 2rem; color: var(--text-secondary);">© ${new Date().getFullYear()} Connor Horning.</p>
        </div>
    </footer>

    <!-- Mobile Navigation Script -->
    <script>
        document.querySelector('.mobile-toggle')?.addEventListener('click', function() {
            document.querySelector('.desktop-menu').classList.toggle('active');
            this.classList.toggle('active');
        });
    </script>
`;
        }

        // Use custom navbar/footer if uploaded, otherwise use defaults
        const navbarHtml = includeNavFooter
            ? (customNavbarHtml || getDefaultNavbar())
            : '';
        const footerHtml = includeNavFooter
            ? (customFooterHtml || getDefaultFooter())
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metadata.description)}">
    <title>${escapeHtml(metadata.title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
${css}
    </style>
</head>
<body>
${navbarHtml}
    <!-- Main Content -->
    <main class="content-wrapper article-content">
        <h1>${escapeHtml(metadata.title)}</h1>
        <p class="subtitle">${escapeHtml(metadata.description)}</p>
        ${githubButton}
        
        ${renderedContent}
    </main>
${footerHtml}
</body>
</html>`;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Download HTML file
     */
    async function downloadHtml() {
        try {
            showToast('Generating HTML...', 'info');
            const html = await generateHtml();
            const metadata = getMetadata();
            const filename = generateFilename(metadata.title) + '.html';

            downloadFile(html, filename, 'text/html');
            showToast(`Downloaded ${filename}`, 'success');
        } catch (error) {
            console.error('Export: Error generating HTML', error);
            showToast('Error generating HTML file', 'error');
        }
    }

    /**
     * Download Markdown file
     */
    function downloadMarkdown() {
        const metadata = getMetadata();
        const markdown = Editor.getContent();
        const filename = generateFilename(metadata.title) + '.md';

        // Add frontmatter
        const frontmatter = `---
title: ${metadata.title}
date: ${metadata.date}
description: ${metadata.description}
type: ${metadata.type}
${metadata.coverImage ? `coverImage: ${metadata.coverImage}` : ''}
${metadata.githubUrl ? `githubUrl: ${metadata.githubUrl}` : ''}
---

`;

        downloadFile(frontmatter + markdown, filename, 'text/markdown');
        showToast(`Downloaded ${filename}`, 'success');
    }

    /**
     * Download a file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Generate index snippet based on post type
     * @returns {string} HTML snippet for index page
     */
    function generateSnippet() {
        const metadata = getMetadata();
        const filename = generateFilename(metadata.title) + '.html';

        if (metadata.type === 'project') {
            const coverImage = metadata.coverImage || 'Images/project_placeholder.png';
            return `                    <div class="project-card" onclick="location.href='Projects/${filename}';" style="cursor: pointer;">
                        <img src="${coverImage}" alt="${escapeHtml(metadata.title)}" style="width: 100%; height: 200px; object-fit: cover;">
                        <div class="card-content">
                            <h3>${escapeHtml(metadata.title)}</h3>
                            <p>${escapeHtml(metadata.description)}</p>
                            <a href="Projects/${filename}" class="card-link">Explore &rarr;</a>
                        </div>
                    </div>`;
        } else {
            return `                    <article class="article-item" onclick="location.href='articles/${filename}';">
                        <span class="date">${escapeHtml(metadata.date)}</span>
                        <div class="article-info">
                            <h3>${escapeHtml(metadata.title)}</h3>
                            <p>${escapeHtml(metadata.description)}</p>
                        </div>
                        <a href="articles/${filename}" class="read-more">Read</a>
                    </article>`;
        }
    }

    /**
     * Show snippet modal
     */
    function showSnippetModal() {
        const metadata = getMetadata();

        if (!metadata.title || metadata.title.trim() === '') {
            showToast('Please enter a title first', 'error');
            return;
        }

        const snippet = generateSnippet();
        if (snippetCode) {
            snippetCode.textContent = snippet;
        }
        if (snippetModal) {
            snippetModal.style.display = 'flex';
        }
    }

    /**
     * Hide modal
     */
    function hideModal() {
        if (snippetModal) {
            snippetModal.style.display = 'none';
        }
    }

    /**
     * Copy snippet to clipboard
     */
    async function copySnippetToClipboard() {
        const snippet = generateSnippet();

        try {
            await navigator.clipboard.writeText(snippet);
            showToast('Snippet copied to clipboard!', 'success');
            hideModal();
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = snippet;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Snippet copied to clipboard!', 'success');
            hideModal();
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Type: 'success', 'error', 'info'
     */
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show ' + type;

        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    // Public API
    return {
        init,
        generateHtml,
        generateSnippet,
        showToast
    };
})();
