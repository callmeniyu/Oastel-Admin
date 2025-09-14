/**
 * Utility functions for validating HTML content from RichTextEditor
 */

/**
 * Strip HTML tags and decode HTML entities to get plain text content
 * @param html HTML string to strip
 * @returns Plain text content
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";
  
  // Remove HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, "");
  
  // Decode common HTML entities
  const withoutEntities = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Remove extra whitespace and trim
  return withoutEntities.replace(/\s+/g, " ").trim();
}

/**
 * Custom Zod validation for HTML content with minimum character count
 * @param minLength Minimum character count for the plain text content
 * @param fieldName Name of the field for error messages
 * @returns Zod validation function
 */
export function htmlMinLength(minLength: number, fieldName: string) {
  return (html: string) => {
    const plainText = stripHtmlTags(html);
    return plainText.length >= minLength;
  };
}

/**
 * Get plain text length from HTML content
 * @param html HTML string
 * @returns Length of plain text content
 */
export function getPlainTextLength(html: string): number {
  return stripHtmlTags(html).length;
}