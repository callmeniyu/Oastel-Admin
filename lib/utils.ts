/**
 * Format numbers with k/M/B suffix for large numbers
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., 1.2k, 1.5M)
 */
export function formatNumber(num: number, decimals: number = 1): string {
    if (num < 1000) return num.toString()
    
    const units = ['', 'k', 'M', 'B', 'T']
    const unitIndex = Math.floor(Math.log10(Math.abs(num)) / 3)
    const unitValue = Math.pow(10, unitIndex * 3)
    const formattedValue = (num / unitValue).toFixed(decimals)
    
    // Remove trailing zeros and decimal point if not needed
    const cleanValue = parseFloat(formattedValue).toString()
    
    return cleanValue + units[unitIndex]
}

/**
 * Debounce function to limit function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

/**
 * Generate URL-friendly slug from text
 * @param text - The text to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
}

/**
 * Auto-save form data to localStorage with debouncing
 * @param key - Storage key
 * @param data - Data to save
 * @param delay - Debounce delay in milliseconds (default: 2000)
 */
let autoSaveTimeout: NodeJS.Timeout
export function autoSaveDraft(key: string, data: any, delay: number = 2000): void {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(key, JSON.stringify(data))
            console.log('Draft auto-saved at', new Date().toLocaleTimeString())
        } catch (error) {
            console.error('Failed to auto-save draft:', error)
        }
    }, delay)
}

/**
 * Load draft from localStorage
 * @param key - Storage key
 * @returns Parsed data or null if not found
 */
export function loadDraft(key: string): any | null {
    try {
        const saved = localStorage.getItem(key)
        return saved ? JSON.parse(saved) : null
    } catch (error) {
        console.error('Failed to load draft:', error)
        localStorage.removeItem(key) // Remove corrupted data
        return null
    }
}

/**
 * Clear draft from localStorage
 * @param key - Storage key
 */
export function clearDraft(key: string): void {
    localStorage.removeItem(key)
    console.log('Draft cleared')
}

/**
 * Save draft immediately to localStorage
 * @param key - Storage key
 * @param data - Data to save
 */
export function saveDraft(key: string, data: any): void {
    try {
        localStorage.setItem(key, JSON.stringify(data))
        console.log('Draft saved manually')
    } catch (error) {
        console.error('Failed to save draft:', error)
    }
}