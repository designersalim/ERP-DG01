import DOMPurify from 'dompurify';

export const sanitizeHtmlWithStyles = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Extract and remove style tags
  const styles = Array.from(doc.querySelectorAll('style'));
  const styleContent = styles.map(s => s.innerHTML).join('\n');
  styles.forEach(s => s.remove());
  
  // Sanitize the rest of the HTML
  const sanitizedBody = DOMPurify.sanitize(doc.body.innerHTML, { 
    ADD_ATTR: ['target', 'class', 'style', 'id', 'onclick'],
    ADD_TAGS: ['section', 'article', 'nav', 'header', 'footer'] // Add other potentially needed tags
  });
  
  return `<div class="w-full h-full"><style>${styleContent}</style>${sanitizedBody}</div>`;
};
