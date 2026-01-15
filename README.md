# Blog Editor & Publisher

A client-side static blog editor for writing posts in Markdown and publishing them to your GitHub Pages site.

## Features

- **Markdown Editor** with toolbar and keyboard shortcuts
- **PDF Import** - Convert PDF documents to Markdown with image extraction
- **Live Preview** with connorhorning.com styling
- **HTML Export** with embedded CSS from your site
- **Index Snippets** for articles and projects sections
- **Dark Mode** interface
- **Fully Offline** - no backend required

## Quick Start

1. Open `index.html` in your browser
2. **Option A**: Write markdown directly in the editor
3. **Option B**: Import a PDF file (drag & drop or click to browse)
4. Fill in post details (title, date, description)
5. Select **Article** or **Project** type
6. Click **Download HTML** to get the finished page
7. Click **Copy Index Snippet** to get the entry for your index.html

## Writing Posts

### Toolbar Buttons

| Button | Action |
|--------|--------|
| H1/H2/H3 | Headings |
| **B** | Bold |
| *I* | Italic |
| `</>` | Inline code |
| • List | Bullet list |
| 1. List | Numbered list |
| " Quote | Blockquote |
| 🔗 Link | Insert link |
| 🖼️ Image | Insert image |
| { } Block | Code block |

### Keyboard Shortcuts

- `Ctrl+B` - Bold
- `Ctrl+I` - Italic
- `Ctrl+K` - Insert link
- `Tab` - Insert spaces

### Markdown Syntax

```markdown
# Heading 1
## Heading 2
### Heading 3

**bold text**
*italic text*
`inline code`

- Bullet item
1. Numbered item

> Blockquote

[Link text](https://url.com)
![Image alt](https://url.com/image.png)

```code block```
```

## Publishing to GitHub Pages

### For Articles:

1. Download the HTML file
2. Place it in your `articles/` folder
3. Copy the index snippet
4. Add it to the `#articles` section of your `index.html`

### For Projects:

1. Download the HTML file
2. Place it in your `Projects/` folder
3. Add a cover image to your `Images/` folder
4. Copy the index snippet
5. Add it to the `#projects` section of your `index.html`

### Deploy

```bash
git add .
git commit -m "Add new post: [title]"
git push
```

## Customizing Styling

The generated HTML fetches CSS from `connorhorning.com/style.css`. To use custom styles:

1. Create a local `style.css`
2. Modify `js/export.js` to use your local CSS
3. Update the template in `generateHtml()` function

## Project Structure

```
blog_editor/
├── index.html          # Main editor page
├── css/
│   └── editor.css      # Editor interface styles
├── js/
│   ├── editor.js       # Toolbar and input handling
│   ├── preview.js      # Live preview rendering
│   ├── export.js       # HTML/snippet generation
│   └── app.js          # App initialization
└── README.md           # This file
```

## Requirements

- Modern browser (Chrome, Firefox, Edge, Safari)
- Internet connection (for marked.js CDN and CSS fetch)
- Or download marked.min.js locally for fully offline use

## License

MIT License - Use freely for your personal site.
