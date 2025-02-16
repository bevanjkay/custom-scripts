export const removeHTML = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
}