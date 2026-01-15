/**
 * DOCX Converter Module
 * Converts Word documents to Markdown using mammoth.js
 * Preserves headings, lists, bold, italic, and other formatting
 */

const DocxConverter = (function () {

    /**
     * Initialize the DOCX converter module
     */
    function init() {
        setupEventListeners();
    }

    /**
     * Set up event listeners for DOCX import
     */
    function setupEventListeners() {
        const fileInput = document.getElementById('docx-input');
        const dropZone = document.getElementById('docx-drop-zone');

        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelect);
        }

        if (dropZone) {
            dropZone.addEventListener('dragover', handleDragOver);
            dropZone.addEventListener('dragleave', handleDragLeave);
            dropZone.addEventListener('drop', handleDrop);
            dropZone.addEventListener('click', () => fileInput?.click());
        }
    }

    /**
     * Handle drag over event
     * @param {DragEvent} e 
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('drag-over');
    }

    /**
     * Handle drag leave event
     * @param {DragEvent} e 
     */
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
    }

    /**
     * Handle file drop event
     * @param {DragEvent} e 
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    }

    /**
     * Handle file input selection
     * @param {Event} e 
     */
    function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    }

    /**
     * Process the selected DOCX file
     * @param {File} file 
     */
    async function processFile(file) {
        // Check file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];

        if (!validTypes.includes(file.type) && !file.name.endsWith('.docx')) {
            showToast('Please select a Word document (.docx)', 'error');
            return;
        }

        showToast('Converting document...', 'info');
        showProgress(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await convertDocxToMarkdown(arrayBuffer);

            // Set the title from filename (remove .docx extension)
            const titleInput = document.getElementById('post-title');
            if (titleInput && !titleInput.value) {
                titleInput.value = file.name.replace(/\.docx?$/i, '').replace(/[-_]/g, ' ');
                titleInput.dispatchEvent(new Event('input'));
            }

            // Set the markdown content in editor
            Editor.setContent(result.markdown);

            showProgress(false);
            showToast('Document converted successfully!', 'success');

            // Log any warnings
            if (result.warnings && result.warnings.length > 0) {
                console.log('Conversion warnings:', result.warnings);
            }

        } catch (error) {
            console.error('DOCX conversion error:', error);
            showProgress(false);
            showToast('Error converting document: ' + error.message, 'error');
        }
    }

    /**
     * Convert DOCX to Markdown using mammoth.js
     * @param {ArrayBuffer} arrayBuffer - DOCX file data
     * @returns {Promise<{markdown: string, warnings: Array}>}
     */
    async function convertDocxToMarkdown(arrayBuffer) {
        // Configure mammoth to output clean HTML
        const options = {
            styleMap: [
                // Map Word styles to HTML elements
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='Title'] => h1:fresh",
                "p[style-name='Subtitle'] => h2:fresh",
                // Preserve code blocks
                "p[style-name='Code'] => pre > code:fresh",
                // Quote styles
                "p[style-name='Quote'] => blockquote:fresh",
                "p[style-name='Block Quote'] => blockquote:fresh",
                "p[style-name='Intense Quote'] => blockquote:fresh"
            ],
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    };
                });
            })
        };

        // Convert DOCX to HTML first
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options);

        // Convert HTML to Markdown
        const markdown = htmlToMarkdown(result.value);

        return {
            markdown: markdown,
            warnings: result.messages
        };
    }

    /**
     * Convert HTML to Markdown
     * @param {string} html - HTML content from mammoth
     * @returns {string} Markdown content
     */
    function htmlToMarkdown(html) {
        // Create a temporary div to parse the HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Preprocess: merge consecutive ordered lists (mammoth outputs each item as separate <ol>)
        mergeConsecutiveLists(temp);

        // Process the HTML nodes recursively with list continuation tracking
        const state = { listNumber: 0, lastListType: null };
        return processNodesWithState(temp.childNodes, state).trim();
    }

    /**
     * Merge consecutive ordered lists into single lists
     * @param {Element} container 
     */
    function mergeConsecutiveLists(container) {
        const children = Array.from(container.children);

        for (let i = 0; i < children.length - 1; i++) {
            const current = children[i];
            const next = children[i + 1];

            // Check if both are ordered lists and should be merged
            if (current.tagName === 'OL' && next.tagName === 'OL') {
                // Move all items from next list to current
                while (next.firstChild) {
                    current.appendChild(next.firstChild);
                }
                // Remove the empty list
                next.remove();
                // Re-check this position since we removed an element
                i--;
                // Update children array
                children.splice(i + 2, 1);
            }

            // Also merge consecutive unordered lists
            if (current.tagName === 'UL' && next.tagName === 'UL') {
                while (next.firstChild) {
                    current.appendChild(next.firstChild);
                }
                next.remove();
                i--;
                children.splice(i + 2, 1);
            }
        }
    }

    /**
     * Process HTML nodes with state tracking for list continuation
     * @param {NodeList} nodes 
     * @param {Object} state - State object for tracking list numbers
     * @returns {string} Markdown
     */
    function processNodesWithState(nodes, state) {
        let result = '';
        let lastWasListItem = false;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    // Check if this text follows a list item and should be indented
                    if (lastWasListItem) {
                        result += '    ' + text + '\n\n';
                    } else {
                        result += text;
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();

                // Track if we're processing a list
                if (tag === 'ol' || tag === 'ul') {
                    result += processElement(node, '');
                    lastWasListItem = true;
                } else if (tag === 'p' && lastWasListItem) {
                    // Paragraph after list item - indent it
                    const content = processNodes(node.childNodes, '').trim();
                    if (content) {
                        result += '    ' + content + '\n\n';
                    }
                } else {
                    result += processElement(node, '');
                    if (tag === 'p' || tag.match(/^h[1-6]$/)) {
                        lastWasListItem = false;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Process HTML nodes and convert to Markdown
     * @param {NodeList} nodes 
     * @param {string} context - Current context (e.g., 'list')
     * @returns {string} Markdown
     */
    function processNodes(nodes, context = '') {
        let result = '';

        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                result += processElement(node, context);
            }
        }

        return result;
    }

    /**
     * Process a single HTML element and convert to Markdown
     * @param {Element} element 
     * @param {string} context
     * @returns {string} Markdown
     */
    function processElement(element, context) {
        const tag = element.tagName.toLowerCase();
        const children = () => processNodes(element.childNodes, context);

        switch (tag) {
            // Headings
            case 'h1':
                return '\n# ' + children().trim() + '\n\n';
            case 'h2':
                return '\n## ' + children().trim() + '\n\n';
            case 'h3':
                return '\n### ' + children().trim() + '\n\n';
            case 'h4':
                return '\n#### ' + children().trim() + '\n\n';
            case 'h5':
                return '\n##### ' + children().trim() + '\n\n';
            case 'h6':
                return '\n###### ' + children().trim() + '\n\n';

            // Paragraphs
            case 'p':
                const pContent = children().trim();
                if (!pContent) return '';
                return pContent + '\n\n';

            // Bold and strong - handle spaces properly
            case 'strong':
            case 'b': {
                const content = children();
                const trimmed = content.trim();
                if (!trimmed) return content;
                const leadingSpace = content.startsWith(' ') ? ' ' : '';
                const trailingSpace = content.endsWith(' ') ? ' ' : '';
                return leadingSpace + '**' + trimmed + '**' + trailingSpace;
            }

            // Italic and emphasis - handle spaces properly
            case 'em':
            case 'i': {
                const content = children();
                const trimmed = content.trim();
                if (!trimmed) return content;
                const leadingSpace = content.startsWith(' ') ? ' ' : '';
                const trailingSpace = content.endsWith(' ') ? ' ' : '';
                return leadingSpace + '*' + trimmed + '*' + trailingSpace;
            }

            // Underline (use underscore as markdown has no underline)
            case 'u': {
                const content = children();
                const trimmed = content.trim();
                if (!trimmed) return content;
                const leadingSpace = content.startsWith(' ') ? ' ' : '';
                const trailingSpace = content.endsWith(' ') ? ' ' : '';
                return leadingSpace + '_' + trimmed + '_' + trailingSpace;
            }

            // Strikethrough
            case 's':
            case 'strike':
            case 'del': {
                const content = children();
                const trimmed = content.trim();
                if (!trimmed) return content;
                const leadingSpace = content.startsWith(' ') ? ' ' : '';
                const trailingSpace = content.endsWith(' ') ? ' ' : '';
                return leadingSpace + '~~' + trimmed + '~~' + trailingSpace;
            }

            // Code
            case 'code':
                if (element.parentElement?.tagName.toLowerCase() === 'pre') {
                    return children();
                }
                return '`' + children() + '`';

            // Code blocks
            case 'pre':
                return '\n```\n' + children().trim() + '\n```\n\n';

            // Blockquotes
            case 'blockquote':
                const quoteLines = children().trim().split('\n');
                return '\n' + quoteLines.map(line => '> ' + line).join('\n') + '\n\n';

            // Unordered lists
            case 'ul':
                return '\n' + processListItems(element, 'ul', 0) + '\n';

            // Ordered lists
            case 'ol':
                return '\n' + processListItems(element, 'ol', 0) + '\n';

            // List items (handled by processListItems)
            case 'li':
                return children();

            // Links
            case 'a':
                const href = element.getAttribute('href') || '';
                const linkText = children().trim();
                if (href) {
                    return '[' + linkText + '](' + href + ')';
                }
                return linkText;

            // Images
            case 'img':
                const src = element.getAttribute('src') || '';
                const alt = element.getAttribute('alt') || 'Image';
                // Center images using HTML
                return '\n<p align="center"><img src="' + src + '" alt="' + alt + '" style="max-width: 100%;"></p>\n\n';

            // Line breaks
            case 'br':
                return '\n';

            // Horizontal rules
            case 'hr':
                return '\n---\n\n';

            // Tables
            case 'table':
                return '\n' + processTable(element) + '\n';

            // Spans and divs - just process children
            case 'span':
            case 'div':
                return children();

            // Default - just process children
            default:
                return children();
        }
    }

    /**
     * Process list items with proper indentation
     * @param {Element} listElement - ul or ol element
     * @param {string} type - 'ul' or 'ol'
     * @param {number} depth - Nesting depth
     * @returns {string} Markdown list
     */
    function processListItems(listElement, type, depth) {
        let result = '';
        const indent = '    '.repeat(depth);
        let itemNumber = 1;

        for (const child of listElement.children) {
            if (child.tagName.toLowerCase() === 'li') {
                // Get direct text content (not nested lists)
                let itemText = '';
                let nestedLists = '';

                for (const node of child.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        itemText += node.textContent;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const tag = node.tagName.toLowerCase();
                        if (tag === 'ul') {
                            nestedLists += processListItems(node, 'ul', depth + 1);
                        } else if (tag === 'ol') {
                            nestedLists += processListItems(node, 'ol', depth + 1);
                        } else {
                            itemText += processElement(node, 'list');
                        }
                    }
                }

                itemText = itemText.trim();

                if (type === 'ul') {
                    result += indent + '- ' + itemText + '\n';
                } else {
                    result += indent + itemNumber + '. ' + itemText + '\n';
                    itemNumber++;
                }

                if (nestedLists) {
                    result += nestedLists;
                }
            }
        }

        return result;
    }

    /**
     * Process HTML table to Markdown table
     * @param {Element} tableElement 
     * @returns {string} Markdown table
     */
    function processTable(tableElement) {
        const rows = tableElement.querySelectorAll('tr');
        if (rows.length === 0) return '';

        let result = '';
        let isFirstRow = true;

        for (const row of rows) {
            const cells = row.querySelectorAll('th, td');
            const cellContents = Array.from(cells).map(cell =>
                processNodes(cell.childNodes).trim().replace(/\|/g, '\\|')
            );

            result += '| ' + cellContents.join(' | ') + ' |\n';

            // Add separator after header row
            if (isFirstRow) {
                result += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
                isFirstRow = false;
            }
        }

        return result;
    }

    /**
     * Show/hide progress indicator
     * @param {boolean} show 
     */
    function showProgress(show) {
        const progressBar = document.getElementById('docx-progress');
        if (progressBar) {
            progressBar.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show toast notification
     * @param {string} message 
     * @param {string} type 
     */
    function showToast(message, type) {
        if (typeof Export !== 'undefined' && Export.showToast) {
            Export.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // Public API
    return {
        init
    };
})();
