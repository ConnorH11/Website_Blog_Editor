/**
 * PDF Converter Module
 * Handles PDF import, text extraction, and image capture using pdf.js
 */

const PdfConverter = (function () {
    // pdf.js worker path (CDN)
    const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // Extracted images storage
    let extractedImages = [];

    /**
     * Initialize the PDF converter module
     */
    function init() {
        // Set up pdf.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        }

        setupEventListeners();
    }

    /**
     * Set up event listeners for PDF import
     */
    function setupEventListeners() {
        const fileInput = document.getElementById('pdf-input');
        const dropZone = document.getElementById('pdf-drop-zone');
        const importBtn = document.getElementById('import-pdf-btn');

        if (fileInput) {
            fileInput.addEventListener('change', handleFileSelect);
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => fileInput?.click());
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
     * Process the selected PDF file
     * @param {File} file 
     */
    async function processFile(file) {
        if (file.type !== 'application/pdf') {
            showToast('Please select a PDF file', 'error');
            return;
        }

        showToast('Processing PDF...', 'info');
        showProgress(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await convertPdfToMarkdown(arrayBuffer, file.name);

            // Set the title from filename (remove .pdf extension)
            const titleInput = document.getElementById('post-title');
            if (titleInput && !titleInput.value) {
                titleInput.value = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
                titleInput.dispatchEvent(new Event('input'));
            }

            // Set the markdown content in editor
            Editor.setContent(result.markdown);

            // Store extracted images for export
            extractedImages = result.images;

            showProgress(false);
            showToast(`Converted ${result.pageCount} pages with ${result.images.length} images`, 'success');

        } catch (error) {
            console.error('PDF conversion error:', error);
            showProgress(false);
            showToast('Error converting PDF: ' + error.message, 'error');
        }
    }

    /**
     * Convert PDF to Markdown
     * @param {ArrayBuffer} arrayBuffer - PDF file data
     * @param {string} filename - Original filename
     * @returns {Promise<{markdown: string, images: Array, pageCount: number}>}
     */
    async function convertPdfToMarkdown(arrayBuffer, filename) {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;

        let markdown = '';
        const allImages = [];
        let globalImageCounter = 1;

        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            updateProgress(pageNum, pageCount);

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const pageHeight = viewport.height;

            // Extract text content with positions
            const textContent = await page.getTextContent();
            const textBlocks = extractTextBlocks(textContent, pageHeight);

            // Extract images with positions
            const { images: pageImages, imagePositions } = await extractImagesWithPositions(page, globalImageCounter, pageHeight);

            // Merge and sort all content by Y position (top to bottom)
            const allContent = [];

            // Add text blocks
            for (const block of textBlocks) {
                allContent.push({
                    type: 'text',
                    y: block.y,
                    content: block.text
                });
            }

            // Add images with centered HTML
            for (let i = 0; i < pageImages.length; i++) {
                const img = pageImages[i];
                const pos = imagePositions[i];
                allImages.push(img);
                // Use HTML for centered images
                const centeredImage = `<p align="center"><img src="${img.dataUrl}" alt="Image ${globalImageCounter}" style="max-width: 100%;"></p>`;
                allContent.push({
                    type: 'image',
                    y: pos.y,
                    content: centeredImage,
                    imageIndex: globalImageCounter
                });
                globalImageCounter++;
            }

            // Sort by Y position (higher Y = closer to top of page in PDF coordinates)
            allContent.sort((a, b) => b.y - a.y);

            // Build markdown for this page
            let pageMarkdown = '';
            for (const item of allContent) {
                if (item.content && item.content.trim()) {
                    pageMarkdown += item.content + '\n\n';
                }
            }

            markdown += pageMarkdown;

            // No page separators - content flows continuously
        }

        return {
            markdown: formatMarkdown(markdown.trim()),
            images: allImages,
            pageCount
        };
    }

    /**
     * Extract text blocks with Y positions for proper ordering
     * @param {Object} textContent - pdf.js text content
     * @param {number} pageHeight - Page height for coordinate conversion
     * @returns {Array} Array of text blocks with positions
     */
    function extractTextBlocks(textContent, pageHeight) {
        const items = textContent.items;
        if (!items || items.length === 0) return [];

        const blocks = [];
        let currentBlock = { items: [], y: 0, minY: Infinity, maxY: -Infinity };
        let lastY = null;

        for (const item of items) {
            if (!item.str || !item.str.trim()) continue;

            const y = item.transform[5];
            const fontSize = Math.round(item.height);

            // New block if Y changed significantly (new paragraph/section)
            if (lastY !== null && Math.abs(y - lastY) > fontSize * 1.5) {
                if (currentBlock.items.length > 0) {
                    currentBlock.y = currentBlock.maxY; // Use top of block
                    currentBlock.text = processTextBlock(currentBlock.items);
                    if (currentBlock.text.trim()) {
                        blocks.push(currentBlock);
                    }
                }
                currentBlock = { items: [], y: 0, minY: Infinity, maxY: -Infinity };
            }

            currentBlock.items.push({
                str: item.str,
                x: item.transform[4],
                y: y,
                fontSize: fontSize,
                fontName: item.fontName || ''
            });
            currentBlock.minY = Math.min(currentBlock.minY, y);
            currentBlock.maxY = Math.max(currentBlock.maxY, y);
            lastY = y;
        }

        // Don't forget the last block
        if (currentBlock.items.length > 0) {
            currentBlock.y = currentBlock.maxY;
            currentBlock.text = processTextBlock(currentBlock.items);
            if (currentBlock.text.trim()) {
                blocks.push(currentBlock);
            }
        }

        return blocks;
    }

    /**
     * Process a text block into markdown
     * @param {Array} items - Text items in the block
     * @returns {string} Markdown text
     */
    function processTextBlock(items) {
        if (items.length === 0) return '';

        // Group items by line (similar Y)
        const lines = [];
        let currentLine = [];
        let lastY = items[0].y;

        for (const item of items) {
            if (Math.abs(item.y - lastY) > 3) {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = [];
            }
            currentLine.push(item);
            lastY = item.y;
        }
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // Process each line
        const processedLines = lines.map(lineItems => {
            // Sort by X position
            lineItems.sort((a, b) => a.x - b.x);

            // Join text with proper spacing
            let text = '';
            let lastEndX = lineItems[0].x;

            for (let i = 0; i < lineItems.length; i++) {
                const item = lineItems[i];
                const avgCharWidth = item.fontSize * 0.5;

                // Calculate gap between previous text end and current text start
                if (i > 0) {
                    const gap = item.x - lastEndX;
                    // Add space if there's any noticeable gap
                    if (gap > avgCharWidth * 0.2) {
                        text += ' ';
                    }
                }

                text += item.str;
                lastEndX = item.x + (item.str.length * avgCharWidth);
            }
            text = text.trim();

            // Fix common spacing issues in PDFs
            // More aggressive spacing fixes for common PDF artifacts
            text = text.replace(/([a-z])([A-Z])/g, '$1 $2');  // "aZoom" -> "a Zoom"
            text = text.replace(/\.([A-Za-z])/g, '. $1');     // ".A" -> ". A"
            text = text.replace(/\:([A-Za-z])/g, ': $1');     // ":A" -> ": A"
            text = text.replace(/,([A-Za-z])/g, ', $1');      // ",A" -> ", A"
            text = text.replace(/;([A-Za-z])/g, '; $1');      // ";A" -> "; A"
            text = text.replace(/(\d)([A-Z])/g, '$1 $2');     // "2If" -> "2 If"
            text = text.replace(/([a-z])(\d)/g, '$1 $2');     // "step1" -> "step 1"
            text = text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');  // "textStart" -> "text Start"
            // Fix bracket spacing
            text = text.replace(/\)([A-Z])/g, ') $1');        // ")Next" -> ") Next"
            text = text.replace(/\]([A-Z])/g, '] $1');        // "]Next" -> "] Next"

            // Detect formatting based on font size and style
            const avgFontSize = lineItems.reduce((sum, i) => sum + i.fontSize, 0) / lineItems.length;
            const isBold = lineItems.some(i => i.fontName && (i.fontName.toLowerCase().includes('bold') || i.fontName.includes('Bold')));

            // Check indentation level based on X position
            const firstItemX = lineItems[0].x;
            // Calculate indent level (each ~20-30 points = one level)
            let indentPrefix = '';
            if (firstItemX > 100) {
                indentPrefix = '        '; // Double indent
            } else if (firstItemX > 60) {
                indentPrefix = '    '; // Single indent
            }

            // Heading detection (don't indent headings)
            // More nuanced heading detection
            if (avgFontSize >= 20) {
                return '# ' + text;
            } else if (avgFontSize >= 16) {
                return '## ' + text;
            } else if (avgFontSize >= 14 && isBold) {
                return '### ' + text;
            } else if (avgFontSize >= 13 && isBold && text.length < 80) {
                return '#### ' + text;
            } else if (isBold && text.length < 60 && !text.includes(':')) {
                // Bold text that looks like a sub-heading (but not labels like "Note:")
                return '**' + text + '**';
            }

            // Detect numbered lists (1. 2. 3. etc.) - more flexible
            if (/^\d+[.)]\s+/.test(text)) {
                const match = text.match(/^(\d+)[.)]\s+(.*)/);
                if (match && match[2].length > 0) {
                    return match[1] + '. ' + match[2];
                }
            }

            // Handle merged list items like "1.Item" without space
            if (/^\d+[.)]([A-Z])/.test(text)) {
                const match = text.match(/^(\d+)[.)](.*)/);
                if (match && match[2].length > 0) {
                    return match[1] + '. ' + match[2];
                }
            }

            // Detect lettered sub-items (a. b. c.) - these should be indented
            if (/^[a-z][.)]\s*/i.test(text)) {
                const match = text.match(/^([a-z])[.)]\s*(.*)/i);
                if (match) {
                    return '    ' + match[1].toLowerCase() + '. ' + match[2];
                }
            }

            // Detect roman numeral sub-items (i. ii. iii. iv.)
            if (/^(i{1,3}|iv|v|vi{0,3})[.)]\s*/i.test(text)) {
                const match = text.match(/^(i{1,3}|iv|v|vi{0,3})[.)]\s*(.*)/i);
                if (match) {
                    return '        ' + match[1].toLowerCase() + '. ' + match[2];
                }
            }

            // Detect bullet points
            if (/^[•●○◦▪▫►▸-]\s*/.test(text)) {
                const bulletText = text.replace(/^[•●○◦▪▫►▸-]\s*/, '');
                return indentPrefix + '- ' + bulletText;
            }

            // Apply indentation for regular indented text (like Username: Conf)
            if (indentPrefix && !text.match(/^\d+\./)) {
                return indentPrefix + text;
            }

            return text;
        });

        return processedLines.join('\n');
    }

    /**
     * Extract text content with basic formatting detection
     * @param {Object} textContent - pdf.js text content object
     * @returns {string} Formatted markdown text
     */
    function extractTextWithFormatting(textContent) {
        const items = textContent.items;
        if (!items || items.length === 0) return '';

        let result = '';
        let currentLine = '';
        let lastY = null;
        let lastFontSize = null;
        let lineItems = [];

        // Group items by line (similar Y position)
        for (const item of items) {
            if (!item.str) continue;

            const y = Math.round(item.transform[5]);
            const fontSize = Math.round(item.height);

            // New line detection (Y position changed significantly)
            if (lastY !== null && Math.abs(y - lastY) > 5) {
                // Process previous line
                const lineText = processLine(lineItems, lastFontSize);
                if (lineText) {
                    result += lineText + '\n';
                }
                lineItems = [];
            }

            lineItems.push({
                str: item.str,
                fontSize: fontSize,
                x: item.transform[4]
            });

            lastY = y;
            lastFontSize = fontSize;
        }

        // Process last line
        if (lineItems.length > 0) {
            const lineText = processLine(lineItems, lastFontSize);
            if (lineText) {
                result += lineText + '\n';
            }
        }

        return formatMarkdown(result);
    }

    /**
     * Process a line of text items
     * @param {Array} items - Line items
     * @param {number} fontSize - Font size
     * @returns {string} Processed line
     */
    function processLine(items, fontSize) {
        if (items.length === 0) return '';

        // Sort by X position
        items.sort((a, b) => a.x - b.x);

        // Join text with spaces where there are gaps
        let text = '';
        let lastX = items[0].x;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const gap = item.x - lastX;

            // Add space if there's a significant gap
            if (i > 0 && gap > 10) {
                text += ' ';
            }

            text += item.str;
            lastX = item.x + (item.str.length * (fontSize * 0.6));
        }

        text = text.trim();
        if (!text) return '';

        // Detect headings based on font size
        const avgFontSize = items.reduce((sum, i) => sum + i.fontSize, 0) / items.length;

        if (avgFontSize >= 24) {
            return '# ' + text;
        } else if (avgFontSize >= 18) {
            return '## ' + text;
        } else if (avgFontSize >= 14) {
            return '### ' + text;
        }

        // Detect bullet points
        if (/^[•●○◦▪▫-]\s*/.test(text)) {
            return '- ' + text.replace(/^[•●○◦▪▫-]\s*/, '');
        }

        // Detect numbered lists
        if (/^\d+[.)]\s+/.test(text)) {
            return text.replace(/^(\d+)[.)]\s+/, '$1. ');
        }

        return text;
    }

    /**
     * Format raw text into cleaner markdown
     * @param {string} text - Raw extracted text
     * @returns {string} Cleaned markdown
     */
    function formatMarkdown(text) {
        return text
            // Remove excessive blank lines
            .replace(/\n{3,}/g, '\n\n')
            // Fix broken words (hyphenated at line breaks)
            .replace(/(\w)-\n(\w)/g, '$1$2')
            // Clean up spacing
            .replace(/[ \t]+/g, ' ')
            // Trim lines
            .split('\n')
            .map(line => line.trim())
            .join('\n')
            .trim();
    }

    /**
     * Extract images from a PDF page with their Y positions
     * @param {Object} page - pdf.js page object
     * @param {number} startIndex - Starting image index
     * @param {number} pageHeight - Page height for coordinate reference
     * @returns {Promise<{images: Array, imagePositions: Array}>}
     */
    async function extractImagesWithPositions(page, startIndex, pageHeight) {
        const images = [];
        const imagePositions = [];

        try {
            const operatorList = await page.getOperatorList();
            const OPS = pdfjsLib.OPS;

            // Track image XObjects with their transform matrices
            const imageOps = [];

            // We need to track the current transformation matrix (CTM) 
            // to know where images are positioned
            let ctmStack = [[1, 0, 0, 1, 0, 0]]; // Identity matrix

            for (let i = 0; i < operatorList.fnArray.length; i++) {
                const op = operatorList.fnArray[i];
                const args = operatorList.argsArray[i];

                if (op === OPS.save) {
                    ctmStack.push([...ctmStack[ctmStack.length - 1]]);
                } else if (op === OPS.restore) {
                    if (ctmStack.length > 1) ctmStack.pop();
                } else if (op === OPS.transform) {
                    // Apply transform to current CTM
                    const currentCTM = ctmStack[ctmStack.length - 1];
                    const newMatrix = multiplyMatrices(currentCTM, args);
                    ctmStack[ctmStack.length - 1] = newMatrix;
                } else if (op === OPS.paintImageXObject || op === OPS.paintJpegXObject) {
                    const imageName = args[0];
                    const currentCTM = ctmStack[ctmStack.length - 1];
                    // The Y position is in element [5] of the CTM
                    // Higher Y = higher on the page
                    const yPos = currentCTM[5];

                    if (imageName && !imageOps.some(io => io.name === imageName)) {
                        imageOps.push({
                            name: imageName,
                            y: yPos
                        });
                    }
                }
            }

            // Sort by Y position (descending - top to bottom in PDF coordinates)
            imageOps.sort((a, b) => b.y - a.y);

            // Extract each image
            for (let i = 0; i < imageOps.length; i++) {
                try {
                    const imageOp = imageOps[i];

                    // Get the image object from the page's objs
                    const imgData = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                        page.objs.get(imageOp.name, (data) => {
                            clearTimeout(timeout);
                            if (data) {
                                resolve(data);
                            } else {
                                reject(new Error('Image not found'));
                            }
                        });
                    });

                    // Convert image data to canvas and then to data URL
                    if (imgData && imgData.width && imgData.height) {
                        // Skip very small images (likely icons or artifacts)
                        if (imgData.width < 20 || imgData.height < 20) continue;

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = imgData.width;
                        canvas.height = imgData.height;

                        let imageData;

                        if (imgData.data) {
                            // Raw pixel data
                            if (imgData.kind === 1) {
                                // Grayscale
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                const src = imgData.data;
                                const dst = imageData.data;
                                for (let j = 0, k = 0; j < src.length; j++, k += 4) {
                                    dst[k] = dst[k + 1] = dst[k + 2] = src[j];
                                    dst[k + 3] = 255;
                                }
                            } else if (imgData.kind === 2) {
                                // RGB
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                const src = imgData.data;
                                const dst = imageData.data;
                                for (let j = 0, k = 0; j < src.length; j += 3, k += 4) {
                                    dst[k] = src[j];
                                    dst[k + 1] = src[j + 1];
                                    dst[k + 2] = src[j + 2];
                                    dst[k + 3] = 255;
                                }
                            } else if (imgData.kind === 3) {
                                // RGBA
                                imageData = new ImageData(
                                    new Uint8ClampedArray(imgData.data),
                                    imgData.width,
                                    imgData.height
                                );
                            } else {
                                // Fallback
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                imageData.data.set(imgData.data);
                            }

                            ctx.putImageData(imageData, 0, 0);

                            const dataUrl = canvas.toDataURL('image/png');
                            images.push({
                                index: startIndex + images.length,
                                dataUrl: dataUrl,
                                width: imgData.width,
                                height: imgData.height
                            });
                            imagePositions.push({ y: imageOp.y });

                        } else if (imgData.bitmap) {
                            // ImageBitmap
                            ctx.drawImage(imgData.bitmap, 0, 0);

                            const dataUrl = canvas.toDataURL('image/png');
                            images.push({
                                index: startIndex + images.length,
                                dataUrl: dataUrl,
                                width: imgData.width,
                                height: imgData.height
                            });
                            imagePositions.push({ y: imageOp.y });
                        }
                    }
                } catch (imgError) {
                    console.warn('Error extracting individual image:', imgError);
                }
            }

        } catch (error) {
            console.warn('Error extracting images from page:', error);
        }

        return { images, imagePositions };
    }

    /**
     * Multiply two transformation matrices
     * @param {Array} a - First matrix [a, b, c, d, e, f]
     * @param {Array} b - Second matrix
     * @returns {Array} Resulting matrix
     */
    function multiplyMatrices(a, b) {
        return [
            a[0] * b[0] + a[2] * b[1],
            a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3],
            a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4],
            a[1] * b[4] + a[3] * b[5] + a[5]
        ];
    }

    /**
     * Extract images from a PDF page
     * @param {Object} page - pdf.js page object
     * @param {number} startIndex - Starting image index
     * @returns {Promise<Array>} Array of image objects with dataUrl
     */
    async function extractImagesFromPage(page, startIndex) {
        const images = [];

        try {
            const operatorList = await page.getOperatorList();
            const OPS = pdfjsLib.OPS;

            // Track which image XObjects we need to extract
            const imageRefs = [];

            for (let i = 0; i < operatorList.fnArray.length; i++) {
                const op = operatorList.fnArray[i];
                if (op === OPS.paintImageXObject || op === OPS.paintJpegXObject) {
                    const imageName = operatorList.argsArray[i][0];
                    if (imageName && !imageRefs.includes(imageName)) {
                        imageRefs.push(imageName);
                    }
                }
            }

            // Extract each image
            for (let i = 0; i < imageRefs.length; i++) {
                try {
                    const imageName = imageRefs[i];

                    // Get the image object from the page's objs
                    const imgData = await new Promise((resolve, reject) => {
                        page.objs.get(imageName, (data) => {
                            if (data) {
                                resolve(data);
                            } else {
                                reject(new Error('Image not found'));
                            }
                        });
                    });

                    // Convert image data to canvas and then to data URL
                    if (imgData && imgData.width && imgData.height) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = imgData.width;
                        canvas.height = imgData.height;

                        // Handle different image data formats
                        let imageData;

                        if (imgData.data) {
                            // Raw pixel data
                            if (imgData.kind === 1) {
                                // Grayscale
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                const src = imgData.data;
                                const dst = imageData.data;
                                for (let j = 0, k = 0; j < src.length; j++, k += 4) {
                                    dst[k] = dst[k + 1] = dst[k + 2] = src[j];
                                    dst[k + 3] = 255;
                                }
                            } else if (imgData.kind === 2) {
                                // RGB
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                const src = imgData.data;
                                const dst = imageData.data;
                                for (let j = 0, k = 0; j < src.length; j += 3, k += 4) {
                                    dst[k] = src[j];
                                    dst[k + 1] = src[j + 1];
                                    dst[k + 2] = src[j + 2];
                                    dst[k + 3] = 255;
                                }
                            } else if (imgData.kind === 3) {
                                // RGBA
                                imageData = new ImageData(
                                    new Uint8ClampedArray(imgData.data),
                                    imgData.width,
                                    imgData.height
                                );
                            } else {
                                // Fallback: assume RGBA-like format
                                imageData = ctx.createImageData(imgData.width, imgData.height);
                                imageData.data.set(imgData.data);
                            }

                            ctx.putImageData(imageData, 0, 0);

                            const dataUrl = canvas.toDataURL('image/png');
                            const imgIndex = startIndex + images.length;

                            images.push({
                                index: imgIndex,
                                dataUrl: dataUrl,
                                width: imgData.width,
                                height: imgData.height
                            });
                        } else if (imgData.bitmap) {
                            // ImageBitmap - render directly
                            ctx.drawImage(imgData.bitmap, 0, 0);

                            const dataUrl = canvas.toDataURL('image/png');
                            const imgIndex = startIndex + images.length;

                            images.push({
                                index: imgIndex,
                                dataUrl: dataUrl,
                                width: imgData.width,
                                height: imgData.height
                            });
                        } else if (imgData.src) {
                            // Already has a source URL (rare)
                            images.push({
                                index: startIndex + images.length,
                                dataUrl: imgData.src,
                                width: imgData.width,
                                height: imgData.height
                            });
                        }
                    }
                } catch (imgError) {
                    console.warn('Error extracting individual image:', imgError);
                }
            }

        } catch (error) {
            console.warn('Error extracting images from page:', error);
        }

        return images;
    }

    /**
     * Show/hide progress indicator
     * @param {boolean} show 
     */
    function showProgress(show) {
        const progressBar = document.getElementById('pdf-progress');
        if (progressBar) {
            progressBar.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Update progress bar
     * @param {number} current 
     * @param {number} total 
     */
    function updateProgress(current, total) {
        const progressBar = document.getElementById('pdf-progress-bar');
        const progressText = document.getElementById('pdf-progress-text');

        if (progressBar) {
            const percent = (current / total) * 100;
            progressBar.style.width = `${percent}%`;
        }

        if (progressText) {
            progressText.textContent = `Processing page ${current} of ${total}...`;
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

    /**
     * Get extracted images for export
     * @returns {Array} Extracted images
     */
    function getExtractedImages() {
        return extractedImages;
    }

    /**
     * Clear extracted images
     */
    function clearImages() {
        extractedImages = [];
    }

    // Public API
    return {
        init,
        getExtractedImages,
        clearImages
    };
})();
