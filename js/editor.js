/**
 * Editor Module
 * Handles markdown editor toolbar actions and keyboard shortcuts
 */

const Editor = (function () {
    // DOM Elements
    let editorTextarea;
    let toolbar;

    /**
     * Initialize the editor module
     */
    function init() {
        editorTextarea = document.getElementById('markdown-editor');
        toolbar = document.querySelector('.toolbar');

        if (!editorTextarea || !toolbar) {
            console.error('Editor: Required elements not found');
            return;
        }

        setupToolbarListeners();
        setupKeyboardShortcuts();
        setupInputListeners();
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
            'codeblock': () => insertCodeBlock()
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
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                triggerPreviewUpdate();
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
     * Trigger preview update event
     */
    function triggerPreviewUpdate() {
        document.dispatchEvent(new CustomEvent('editor:update', {
            detail: { content: editorTextarea.value }
        }));
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
            // Store original content with images
            originalContent = content;
            imagesCollapsed = false;

            editorTextarea.value = content;
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
     */
    function toggleImageCollapse() {
        if (!editorTextarea) return;

        if (imagesCollapsed) {
            // Expand - Restore images into the CURRENT content (preserving key text edits)
            const currentContent = editorTextarea.value;
            editorTextarea.value = restoreImages(currentContent);
            imagesCollapsed = false;
        } else {
            // Collapse - Replace images with unique placeholders and store data
            const content = editorTextarea.value;
            // Clear store on new collapse to avoid stale data buildup
            imageStore = {};
            editorTextarea.value = collapseImages(content);
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
            // Always return original content with images for export
            return originalContent || (editorTextarea ? editorTextarea.value : '');
        },
        setContent,
        toggleImageCollapse,
        initCollapseButton
    };
})();
