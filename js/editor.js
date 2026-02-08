/**
 * Editor Module
 * Handles markdown editor toolbar actions and keyboard shortcuts
 */

const Editor = (function () {
    // DOM Elements
    let editorTextarea;
    let toolbar;
    let wordCountDisplay;
    let clearButton;
    let autosaveIndicator;
    let descCounter;
    let undoBtn;
    let redoBtn;
    let shortcutsBtn;
    let markdownBtn;
    let autoSlugBtn;
    let todayBtn;
    let readingTime;
    let fullscreenBtn;
    let tocBtn;

    // Auto-save settings
    const AUTOSAVE_KEY = 'blog-editor-autosave';
    const AUTOSAVE_DELAY = 2000; // 2 seconds
    let autosaveTimer;

    // Undo/Redo history
    const MAX_HISTORY = 50;
    let history = [];
    let historyIndex = -1;
    let isUndoRedo = false;

    /**
     * Initialize the editor module
     */
    function init() {
        editorTextarea = document.getElementById('markdown-editor');
        toolbar = document.querySelector('.toolbar');
        wordCountDisplay = document.getElementById('word-count');
        clearButton = document.getElementById('clear-editor');
        autosaveIndicator = document.getElementById('autosave-indicator');
        descCounter = document.getElementById('desc-counter');
        undoBtn = document.getElementById('undo-btn');
        redoBtn = document.getElementById('redo-btn');
        shortcutsBtn = document.getElementById('shortcuts-help');
        markdownBtn = document.getElementById('markdown-help');
        autoSlugBtn = document.getElementById('auto-slug-btn');
        todayBtn = document.getElementById('today-btn');
        readingTime = document.getElementById('reading-time');
        fullscreenBtn = document.getElementById('fullscreen-btn');
        tocBtn = document.getElementById('generate-toc');

        if (!editorTextarea || !toolbar) {
            console.error('Editor: Required elements not found');
            return;
        }

        setupToolbarListeners();
        setupKeyboardShortcuts();
        setupInputListeners();
        setupClearButton();
        setupUndoRedo();
        setupModals();
        setupDescriptionCounter();
        setupSmartButtons();
        setupFullscreen();
        setupDragDrop();
        restoreAutoSave(); // Restore previous work
        updateWordCount(); // Initial count
        updateUndoRedoButtons(); // Initial button state
    }

    /**
     * Set up toolbar button click handlers
     */
    function setupToolbarListeners() {
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            e.preventDefault();
            const action = button.dataset.action;
            handleToolbarAction(action);
        });
    }

    /**
     * Handle toolbar button actions
     * @param {string} action - The action to perform
     */
    function handleToolbarAction(action) {
        const actions = {
            'h1': () => insertLinePrefix('# '),
            'h2': () => insertLinePrefix('## '),
            'h3': () => insertLinePrefix('### '),
            'bold': () => wrapSelection('**', '**'),
            'italic': () => wrapSelection('*', '*'),
            'code': () => wrapSelection('`', '`'),
            'ul': () => insertLinePrefix('- '),
            'ol': () => insertOrderedList(),
            'quote': () => insertLinePrefix('> '),
            'link': () => insertLink(),
            'image': () => insertImage(),
            'codeblock': () => insertCodeBlock(),
            'strikethrough': () => wrapSelection('~~', '~~'),
            'table': () => insertTable(),
            'hr': () => insertHorizontalRule()
        };

        if (actions[action]) {
            actions[action]();
            editorTextarea.focus();
            triggerPreviewUpdate();
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        editorTextarea.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + B = Bold
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                handleToolbarAction('bold');
            }
            // Ctrl/Cmd + I = Italic
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                handleToolbarAction('italic');
            }
            // Ctrl/Cmd + K = Link
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                handleToolbarAction('link');
            }
            // Ctrl/Cmd + Z = Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
            // Ctrl/Cmd + Y = Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
            // ? = Show shortcuts
            if (e.key === '?' && !e.shiftKey) {
                e.preventDefault();
                showShortcutsModal();
            }
            // Shift + ?= Show markdown guide
            if (e.key === '?' && e.shiftKey) {
                e.preventDefault();
                showMarkdownModal();
            }
            // Tab = Insert spaces instead of moving focus
            if (e.key === 'Tab') {
                e.preventDefault();
                insertAtCursor('    ');
                triggerPreviewUpdate();
            }
        });
    }

    /**
     * Set up input listeners for live preview
     */
    function setupInputListeners() {
        // Debounced input for performance
        let debounceTimer;
        editorTextarea.addEventListener('input', () => {
            if (!isUndoRedo) {
                saveToHistory();
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                triggerPreviewUpdate();
                updateWordCount();
                scheduleAutoSave();
            }, 150);
        });
    }

    /**
     * Insert text at cursor position
     * @param {string} text - Text to insert
     */
    function insertAtCursor(text) {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const value = editorTextarea.value;

        editorTextarea.value = value.substring(0, start) + text + value.substring(end);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + text.length;
    }

    /**
     * Wrap selected text with prefix and suffix
     * @param {string} prefix - Text before selection
     * @param {string} suffix - Text after selection
     */
    function wrapSelection(prefix, suffix) {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const value = editorTextarea.value;
        const selectedText = value.substring(start, end) || 'text';

        const newText = prefix + selectedText + suffix;
        editorTextarea.value = value.substring(0, start) + newText + value.substring(end);

        // Select the inserted text (excluding markers)
        editorTextarea.selectionStart = start + prefix.length;
        editorTextarea.selectionEnd = start + prefix.length + selectedText.length;
    }

    /**
     * Insert prefix at the start of the current line
     * @param {string} prefix - Text to insert at line start
     */
    function insertLinePrefix(prefix) {
        const start = editorTextarea.selectionStart;
        const value = editorTextarea.value;

        // Find the start of the current line
        let lineStart = value.lastIndexOf('\n', start - 1) + 1;

        // Insert prefix at line start
        editorTextarea.value = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + prefix.length;
    }

    /**
     * Insert ordered list item
     */
    function insertOrderedList() {
        const start = editorTextarea.selectionStart;
        const value = editorTextarea.value;

        // Find the start of the current line
        let lineStart = value.lastIndexOf('\n', start - 1) + 1;

        // Count existing list items to get the next number
        const textBefore = value.substring(0, lineStart);
        const lines = textBefore.split('\n');
        let listNumber = 1;

        // Check previous line for list item number
        if (lines.length > 1) {
            const prevLine = lines[lines.length - 2];
            const match = prevLine.match(/^(\d+)\. /);
            if (match) {
                listNumber = parseInt(match[1]) + 1;
            }
        }

        const prefix = `${listNumber}. `;
        editorTextarea.value = value.substring(0, lineStart) + prefix + value.substring(lineStart);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + prefix.length;
    }

    /**
     * Insert a link
     */
    function insertLink() {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const value = editorTextarea.value;
        const selectedText = value.substring(start, end) || 'link text';

        const linkMarkdown = `[${selectedText}](https://example.com)`;
        editorTextarea.value = value.substring(0, start) + linkMarkdown + value.substring(end);

        // Position cursor at URL
        const urlStart = start + selectedText.length + 3;
        editorTextarea.selectionStart = urlStart;
        editorTextarea.selectionEnd = urlStart + 19; // Select the example URL
    }

    /**
     * Insert an image
     */
    function insertImage() {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const value = editorTextarea.value;
        const selectedText = value.substring(start, end) || 'alt text';

        const imageMarkdown = `![${selectedText}](https://example.com/image.png)`;
        editorTextarea.value = value.substring(0, start) + imageMarkdown + value.substring(end);

        // Position cursor at URL
        const urlStart = start + selectedText.length + 4;
        editorTextarea.selectionStart = urlStart;
        editorTextarea.selectionEnd = urlStart + 30; // Select the example URL
    }

    /**
     * Insert a code block
     */
    function insertCodeBlock() {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        const value = editorTextarea.value;
        const selectedText = value.substring(start, end) || 'code here';

        const codeBlock = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        editorTextarea.value = value.substring(0, start) + codeBlock + value.substring(end);

        // Position cursor inside code block
        editorTextarea.selectionStart = start + 5;
        editorTextarea.selectionEnd = start + 5 + selectedText.length;
    }

    /**
     * Insert a table
     */
    function insertTable() {
        const start = editorTextarea.selectionStart;
        const value = editorTextarea.value;

        const table = `\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n`;
        editorTextarea.value = value.substring(0, start) + table + value.substring(start);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 4;
    }

    /**
     * Insert horizontal rule
     */
    function insertHorizontalRule() {
        const start = editorTextarea.selectionStart;
        const value = editorTextarea.value;

        const hr = `\n---\n\n`;
        editorTextarea.value = value.substring(0, start) + hr + value.substring(start);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + hr.length;
    }

    /**
     * Trigger preview update event
     */
    function triggerPreviewUpdate() {
        document.dispatchEvent(new CustomEvent('editor:update', {
            detail: { content: editorTextarea.value }
        }));
    }

    /**
     * Update word and character count
     */
    function updateWordCount() {
        if (!wordCountDisplay || !editorTextarea) return;

        const text = editorTextarea.value;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;

        wordCountDisplay.textContent = `${words} words / ${chars} chars`;

        // Update reading time (average 200 words per minute)
        if (readingTime) {
            const minutes = Math.max(1, Math.ceil(words / 200));
            readingTime.textContent = `📖 ${minutes} min read`;
        }
    }

    /**
     * Schedule auto-save
     */
    function scheduleAutoSave() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            saveToLocalStorage();
        }, AUTOSAVE_DELAY);
    }

    /**
     * Save current state to localStorage
     */
    function saveToLocalStorage() {
        if (!editorTextarea) return;

        const state = {
            content: editorTextarea.value,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
            if (autosaveIndicator) {
                autosaveIndicator.textContent = '💾 Saved';
                autosaveIndicator.className = 'autosave-indicator saved';
                setTimeout(() => {
                    autosaveIndicator.className = 'autosave-indicator';
                }, 2000);
            }
            console.log('Auto-saved at', new Date().toLocaleTimeString());
        } catch (e) {
            console.warn('Failed to auto-save:', e);
            if (autosaveIndicator) {
                autosaveIndicator.textContent = '⚠️ Save failed';
                autosaveIndicator.className = 'autosave-indicator error';
            }
        }
    }

    /**
     * Restore from localStorage
     */
    function restoreAutoSave() {
        try {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            if (!saved) return;

            const state = JSON.parse(saved);
            const ageMinutes = (Date.now() - state.timestamp) / 1000 / 60;

            // Only restore if less than 7 days old
            if (ageMinutes < 7 * 24 * 60 && state.content && state.content.trim()) {
                if (confirm(`Restore your last session from ${new Date(state.timestamp).toLocaleString()}?`)) {
                    editorTextarea.value = state.content;
                    triggerPreviewUpdate();
                    updateWordCount();
                }
            }
        } catch (e) {
            console.warn('Failed to restore auto-save:', e);
        }
    }

    /**
     * Setup clear button
     */
    function setupClearButton() {
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (confirm('Clear all content? This cannot be undone!')) {
                    editorTextarea.value = '';
                    localStorage.removeItem(AUTOSAVE_KEY);
                    history = [];
                    historyIndex = -1;
                    triggerPreviewUpdate();
                    updateWordCount();
                    updateUndoRedoButtons();
                }
            });
        }
    }

    /**
     * Setup undo/redo functionality
     */
    function setupUndoRedo() {
        if (undoBtn) {
            undoBtn.addEventListener('click', undo);
        }
        if (redoBtn) {
            redoBtn.addEventListener('click', redo);
        }
    }

    /**
     * Save current state to history
     */
    function saveToHistory() {
        if (!editorTextarea) return;

        const currentContent = editorTextarea.value;

        // Don't save if content hasn't changed
        if (history[historyIndex] === currentContent) return;

        // Remove any future history if we're not at the end
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }

        history.push(currentContent);

        // Limit history size
        if (history.length > MAX_HISTORY) {
            history.shift();
        } else {
            historyIndex++;
        }

        updateUndoRedoButtons();
    }

    /**
     * Undo last change
     */
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            isUndoRedo = true;
            editorTextarea.value = history[historyIndex];
            isUndoRedo = false;
            triggerPreviewUpdate();
            updateWordCount();
            updateUndoRedoButtons();
        }
    }

    /**
     * Redo last undone change
     */
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            isUndoRedo = true;
            editorTextarea.value = history[historyIndex];
            isUndoRedo = false;
            triggerPreviewUpdate();
            updateWordCount();
            updateUndoRedoButtons();
        }
    }

    /**
     * Update undo/redo button states
     */
    function updateUndoRedoButtons() {
        if (undoBtn) {
            undoBtn.disabled = historyIndex <= 0;
        }
        if (redoBtn) {
            redoBtn.disabled = historyIndex >= history.length - 1;
        }
    }

    /**
     * Setup modal controls
     */
    function setupModals() {
        // Shortcuts modal
        const shortcutsModal = document.getElementById('shortcuts-modal');
        const closeShortcuts = document.getElementById('close-shortcuts');

        if (shortcutsBtn && shortcutsModal) {
            shortcutsBtn.addEventListener('click', showShortcutsModal);
        }
        if (closeShortcuts && shortcutsModal) {
            closeShortcuts.addEventListener('click', () => shortcutsModal.style.display = 'none');
            shortcutsModal.addEventListener('click', (e) => {
                if (e.target === shortcutsModal) shortcutsModal.style.display = 'none';
            });
        }

        // Markdown modal
        const markdownModal = document.getElementById('markdown-modal');
        const closeMarkdown = document.getElementById('close-markdown');

        if (markdownBtn && markdownModal) {
            markdownBtn.addEventListener('click', showMarkdownModal);
        }
        if (closeMarkdown && markdownModal) {
            closeMarkdown.addEventListener('click', () => markdownModal.style.display = 'none');
            markdownModal.addEventListener('click', (e) => {
                if (e.target === markdownModal) markdownModal.style.display = 'none';
            });
        }
    }

    /**
     * Show keyboard shortcuts modal
     */
    function showShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Show markdown cheatsheet modal
     */
    function showMarkdownModal() {
        const modal = document.getElementById('markdown-modal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Setup description character counter
     */
    function setupDescriptionCounter() {
        const descInput = document.getElementById('post-description');
        if (descInput && descCounter) {
            const updateCounter = () => {
                const length = descInput.value.length;
                descCounter.textContent = `${length}/155`;

                // Warning if over SEO-optimal length
                if (length > 155) {
                    descCounter.classList.add('warning');
                } else {
                    descCounter.classList.remove('warning');
                }
            };

            descInput.addEventListener('input', updateCounter);
            updateCounter(); // Initial state
        }
    }

    /**
     * Setup smart automation buttons
     */
    function setupSmartButtons() {
        // Auto-generate slug from title
        if (autoSlugBtn) {
            autoSlugBtn.addEventListener('click', () => {
                const titleInput = document.getElementById('post-title');
                const slugInput = document.getElementById('post-slug');

                if (titleInput && slugInput && titleInput.value) {
                    // Generate URL-friendly slug
                    const slug = titleInput.value
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '') // Remove special chars
                        .replace(/\s+/g, '-')      // Replace spaces with hyphens
                        .replace(/-+/g, '-');      // Remove consecutive hyphens

                    slugInput.value = slug;

                    // Visual feedback
                    autoSlugBtn.textContent = '✅ Generated!';
                    setTimeout(() => {
                        autoSlugBtn.textContent = '⚡ Generate Slug';
                    }, 2000);
                }
            });
        }

        // Smart date - set to today
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                const dateInput = document.getElementById('post-date');
                if (dateInput) {
                    const today = new Date().toISOString().split('T')[0];
                    dateInput.value = today;

                    // Visual feedback
                    todayBtn.textContent = '✅';
                    setTimeout(() => {
                        todayBtn.textContent = '📅 Today';
                    }, 1000);
                }
            });
        }

        // Generate table of contents
        if (tocBtn) {
            tocBtn.addEventListener('click', generateTableOfContents);
        }
    }

    /**
     * Generate table of contents from headings
     */
    function generateTableOfContents() {
        if (!editorTextarea) return;

        const content = editorTextarea.value;
        const lines = content.split('\n');
        const headings = [];

        // Find all headings
        lines.forEach(line => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                const level = match[1].length;
                const text = match[2];
                const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                headings.push({ level, text, anchor });
            }
        });

        if (headings.length === 0) {
            alert('No headings found! Add some headings (# ## ###) to generate a TOC.');
            return;
        }

        // Generate TOC markdown
        let toc = '## Table of Contents\n\n';
        headings.forEach(h => {
            const indent = '  '.repeat(h.level - 1);
            toc += `${indent}- [${h.text}](#${h.anchor})\n`;
        });
        toc += '\n---\n\n';

        // Insert at cursor or beginning
        const cursorPos = editorTextarea.selectionStart;
        const before = content.substring(0, cursorPos);
        const after = content.substring(cursorPos);

        editorTextarea.value = before + toc + after;
        triggerPreviewUpdate();
        updateWordCount();

        // Visual feedback
        tocBtn.textContent = '✅ Added!';
        setTimeout(() => {
            tocBtn.textContent = '📑 TOC';
        }, 2000);
    }

    /**
     * Setup fullscreen mode
     */
    function setupFullscreen() {
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', updateFullscreenButton);
    }

    /**
     * Toggle fullscreen mode
     */
    function toggleFullscreen() {
        const editorPanel = document.querySelector('.editor-panel');

        if (!document.fullscreenElement) {
            editorPanel.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Update fullscreen button text
     */
    function updateFullscreenButton() {
        if (fullscreenBtn) {
            if (document.fullscreenElement) {
                fullscreenBtn.textContent = '⛶ Exit Fullscreen';
            } else {
                fullscreenBtn.textContent = '⛶ Fullscreen';
            }
        }
    }

    /**
     * Setup drag and drop for markdown files
     */
    function setupDragDrop() {
        if (!editorTextarea) return;

        // Prevent default drag behavior on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            editorTextarea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight on drag over
        ['dragenter', 'dragover'].forEach(eventName => {
            editorTextarea.addEventListener(eventName, () => {
                editorTextarea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            editorTextarea.addEventListener(eventName, () => {
                editorTextarea.classList.remove('drag-over');
            });
        });

        // Handle drop
        editorTextarea.addEventListener('drop', handleDrop);
    }

    /**
     * Handle dropped files
     */
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];

            // Only accept markdown and text files
            if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.type === 'text/plain') {
                const reader = new FileReader();

                reader.onload = (event) => {
                    if (confirm('Load this file? Current content will be replaced.')) {
                        editorTextarea.value = event.target.result;
                        triggerPreviewUpdate();
                        updateWordCount();
                        saveToHistory();
                    }
                };

                reader.readAsText(file);
            } else {
                alert('Please drop a markdown (.md) or text file!');
            }
        }
    }

    /**
     * Get current editor content
     * @returns {string} The markdown content
     */
    function getContent() {
        return editorTextarea ? editorTextarea.value : '';
    }

    /**
     * Set editor content
     * @param {string} content - The markdown content to set
     */
    function setContent(content) {
        if (editorTextarea) {
            editorTextarea.value = content;
            imagesCollapsed = false; // Reset collapse state when loading new content
            imageStore = {}; // Clear any stored images
            triggerPreviewUpdate();
            updateCollapseButtonState();
        }
    }

    // Image collapse state
    let imagesCollapsed = false;
    let imageStore = {}; // Store image data by ID

    /**
     * Initialize collapse button
     */
    function initCollapseButton() {
        const collapseBtn = document.getElementById('collapse-images-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', toggleImageCollapse);
        }
    }

    /**
     * Toggle image collapse state
     * Flow: 
     * - Hide: current content → collapse images → update textarea
     * - Show: current content (with edits!) → restore images → update textarea
     */
    function toggleImageCollapse() {
        if (!editorTextarea) return;

        const currentContent = editorTextarea.value;

        if (imagesCollapsed) {
            // Expand - Restore images into the CURRENT content (preserving any text edits)
            editorTextarea.value = restoreImages(currentContent);
            imagesCollapsed = false;
        } else {
            // Collapse - Replace images with unique placeholders and store data
            // Clear store on new collapse to avoid stale data buildup
            imageStore = {};
            editorTextarea.value = collapseImages(currentContent);
            imagesCollapsed = true;
        }

        updateCollapseButtonState();
        triggerPreviewUpdate();
    }

    /**
     * Collapse base64 images in content
     * @param {string} content 
     * @returns {string} Content with collapsed images
     */
    function collapseImages(content) {
        // Match HTML image tags with base64 data
        const htmlImgPattern = /<p[^>]*><img[^>]*src="(data:image[^"]*)"[^>]*><\/p>/g;
        // Match markdown images with base64 data
        const mdImgPattern = /!\[([^\]]*)\]\((data:image[^)]+)\)/g;

        let result = content;

        // Replace HTML image tags
        result = result.replace(htmlImgPattern, (match, dataUrl) => {
            const id = 'img-' + Math.random().toString(36).substr(2, 9);
            imageStore[id] = match; // Store the WHOLE tag
            return `[📷 IMAGE-COLLAPSED-${id}]`;
        });

        // Replace markdown images
        result = result.replace(mdImgPattern, (match, alt, dataUrl) => {
            const id = 'img-' + Math.random().toString(36).substr(2, 9);
            imageStore[id] = match; // Store the WHOLE markdown image
            return `[📷 IMAGE-COLLAPSED-${id}]`;
        });

        return result;
    }

    /**
     * Restore images from placeholders
     * @param {string} content 
     * @returns {string} Content with restored images
     */
    function restoreImages(content) {
        return content.replace(/\[📷 IMAGE-COLLAPSED-([^\]]+)\]/g, (match, id) => {
            return imageStore[id] || match; // Return original image or placeholder if not found
        });
    }

    /**
     * Update collapse button text based on state
     */
    function updateCollapseButtonState() {
        const collapseBtn = document.getElementById('collapse-images-btn');
        if (collapseBtn) {
            if (imagesCollapsed) {
                collapseBtn.textContent = '🖼️ Show Images';
                collapseBtn.title = 'Expand image data in editor';
            } else {
                collapseBtn.textContent = '🖼️ Hide Images';
                collapseBtn.title = 'Collapse image data for easier editing';
            }
        }
    }

    // Public API
    return {
        init,
        getContent: function () {
            if (!editorTextarea) return '';

            // Get current editor content
            const currentContent = editorTextarea.value;

            // If images are currently collapsed, restore them from the imageStore
            // This ensures exports always include full images with all text edits
            if (imagesCollapsed) {
                return restoreImages(currentContent);
            }

            return currentContent;
        },
        setContent,
        toggleImageCollapse,
        initCollapseButton
    };
})();
