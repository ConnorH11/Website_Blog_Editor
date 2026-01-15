/**
 * Export Module
 * Handles HTML generation, file downloads, and snippet copying
 */

const Export = (function () {
    // Cached CSS from connorhorning.com
    let cachedCss = null;

    // DOM Elements
    let downloadHtmlBtn;
    let downloadMdBtn;
    let copySnippetBtn;
    let snippetModal;
    let closeModalBtn;
    let snippetCode;
    let copySnippetModalBtn;
    let exportFilename;

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

        setupEventListeners();
        setupFilenameUpdater();
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
     * Fetch CSS from connorhorning.com
     * @returns {Promise<string>} The CSS content
     */
    async function fetchCss() {
        if (cachedCss) return cachedCss;

        try {
            const response = await fetch('https://connorhorning.com/style.css');
            if (!response.ok) throw new Error('Failed to fetch CSS');
            cachedCss = await response.text();
            return cachedCss;
        } catch (error) {
            console.warn('Export: Could not fetch CSS from connorhorning.com, using fallback');
            return getFallbackCss();
        }
    }

    /**
     * Get fallback CSS if fetch fails
     * @returns {string} Fallback CSS
     */
    function getFallbackCss() {
        return `
/* Fallback CSS - matches connorhorning.com style */
:root {
    --text-primary: #f0f0f4;
    --text-secondary: #a0a0b0;
    --bg-primary: #0a0a0f;
    --bg-secondary: #12121a;
    --accent-primary: #6366f1;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
}

.navbar {
    padding: 1rem 2rem;
    background: var(--bg-secondary);
    border-bottom: 1px solid #2a2a38;
}

.nav-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    transition: color 0.2s;
}

.logo:hover {
    color: var(--accent-primary);
}

.desktop-menu {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.nav-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    transition: color 0.2s;
    position: relative;
}

.nav-link:hover {
    color: var(--text-primary);
}

.nav-link::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--accent-primary);
    transition: width 0.2s;
}

.nav-link:hover::after {
    width: 100%;
}

.mobile-toggle {
    display: none;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    padding: 0.25rem;
}

.mobile-toggle span {
    width: 24px;
    height: 2px;
    background: var(--text-primary);
    transition: all 0.2s;
}

@media (max-width: 768px) {
    .desktop-menu {
        display: none;
    }
    
    .mobile-toggle {
        display: flex;
    }
}

.content-wrapper {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
}

.article-content h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

.subtitle {
    color: var(--text-secondary);
    font-size: 1.125rem;
    margin-bottom: 2rem;
}

.article-content h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
}

.article-content h3 {
    font-size: 1.25rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}

.article-content p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
}

.article-content ul,
.article-content ol {
    color: var(--text-secondary);
    margin-bottom: 1rem;
    padding-left: 1.5rem;
}

.article-content blockquote {
    border-left: 4px solid var(--accent-primary);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-secondary);
    font-style: italic;
}

.article-content pre {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1rem 0;
}

.article-content code {
    font-family: 'Fira Code', Consolas, monospace;
    font-size: 0.875em;
}

.article-content a {
    color: var(--accent-primary);
    text-decoration: none;
}

.article-content a:hover {
    text-decoration: underline;
}

.article-content img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
}

footer {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
}

@media (max-width: 768px) {
    .content-wrapper {
        padding: 1rem;
    }
    
    .article-content h1 {
        font-size: 2rem;
    }
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

        const githubButton = metadata.githubUrl
            ? `<a href="${metadata.githubUrl}" target="_blank" rel="noopener noreferrer" class="github-link">View on GitHub</a>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metadata.description)}">
    <title>${escapeHtml(metadata.title)} | Connor Horning</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
${css}
    </style>
</head>
<body>
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

    <!-- Main Content -->
    <main class="content-wrapper article-content">
        <h1>${escapeHtml(metadata.title)}</h1>
        <p class="subtitle">${escapeHtml(metadata.description)}</p>
        ${githubButton}
        
        ${renderedContent}
    </main>

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
