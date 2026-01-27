/**
 * Centralized Date Utility for Malaysian Timezone (UTC+8)
 * 
 * This utility ensures ALL date operations across the application
 * use Malaysian timezone consistently to prevent booking count mismatches.
 * 
 * KEY PRINCIPLES:
 * 1. All dates are stored in database as UTC timestamps
 * 2. All date comparisons use Malaysian timezone (Asia/Kuala_Lumpur)
 * 3. Date strings (YYYY-MM-DD) always represent Malaysian calendar dates
 * 4. No local browser timezone should affect date calculations
 */

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

/**
 * Get current date/time in Malaysian timezone
 * @returns Date object representing current moment
 */
export function getMalaysianNow(): Date {
  return new Date();
}

/**
 * Format a Date object as YYYY-MM-DD string in Malaysian timezone
 * This is the canonical way to convert Date to string for API calls
 * 
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format (Malaysian timezone)
 */
export function formatDateAsMYT(date: Date): string {
  // Use Intl.DateTimeFormat to get date components in Malaysian timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(date); // Returns YYYY-MM-DD
}

/**
 * Parse a YYYY-MM-DD string as a Date representing midnight in Malaysian timezone
 * This creates a Date object that, when formatted back, gives the same YYYY-MM-DD
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing the date at midnight Malaysian time
 */
export function parseDateStringAsMYT(dateString: string): Date {
  // Validate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date in Malaysian timezone
  // We construct a UTC date that represents the correct Malaysian date
  // Malaysia is UTC+8, so midnight MYT = 16:00 previous day UTC
  // But we use toLocaleString to handle DST and other edge cases properly
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  const date = new Date(dateStr);
  
  // Adjust for timezone offset
  // Get the date as it would appear in Malaysian timezone
  const malaysianDateStr = new Date(date.toLocaleString('en-US', { timeZone: MALAYSIA_TIMEZONE }));
  
  // Calculate offset and create correct date
  const offset = date.getTime() - malaysianDateStr.getTime();
  return new Date(date.getTime() + offset);
}

/**
 * Create a Date object for a specific date in Malaysian timezone
 * Useful for calendar operations
 * 
 * @param year - Full year (e.g., 2026)
 * @param month - Month (1-12, NOT 0-11)
 * @param day - Day of month (1-31)
 * @returns Date object representing that date in Malaysian timezone
 */
export function createMalaysianDate(year: number, month: number, day: number): Date {
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return parseDateStringAsMYT(dateString);
}

/**
 * Check if two dates represent the same calendar date in Malaysian timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates are the same Malaysian calendar date
 */
export function isSameMalaysianDate(date1: Date, date2: Date): boolean {
  return formatDateAsMYT(date1) === formatDateAsMYT(date2);
}

/**
 * Get Malaysian date components (year, month, day)
 * 
 * @param date - Date to extract components from
 * @returns Object with year, month (1-12), and day
 */
export function getMalaysianDateComponents(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  
  return { year, month, day };
}

/**
 * Add days to a date in Malaysian timezone
 * Ensures the result is a valid Malaysian date
 * 
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDaysMYT(date: Date, days: number): Date {
  const { year, month, day } = getMalaysianDateComponents(date);
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  
  // Ensure we maintain Malaysian timezone consistency
  const dateStr = formatDateAsMYT(newDate);
  return parseDateStringAsMYT(dateStr);
}

/**
 * Get the first day of the month for a given date in Malaysian timezone
 * 
 * @param date - Date in the month
 * @returns Date object representing the first day of that month
 */
export function getFirstDayOfMonthMYT(date: Date): Date {
  const { year, month } = getMalaysianDateComponents(date);
  return createMalaysianDate(year, month, 1);
}

/**
 * Get the last day of the month for a given date in Malaysian timezone
 * 
 * @param date - Date in the month
 * @returns Date object representing the last day of that month
 */
export function getLastDayOfMonthMYT(date: Date): Date {
  const { year, month } = getMalaysianDateComponents(date);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstOfNextMonth = createMalaysianDate(nextYear, nextMonth, 1);
  return addDaysMYT(firstOfNextMonth, -1);
}

/**
 * Get number of days in a month for Malaysian timezone
 * 
 * @param date - Date in the month
 * @returns Number of days in that month
 */
export function getDaysInMonthMYT(date: Date): number {
  const lastDay = getLastDayOfMonthMYT(date);
  return getMalaysianDateComponents(lastDay).day;
}

/**
 * Get the day of week for a date in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeekMYT(date: Date): number {
  const dateStr = formatDateAsMYT(date);
  const tempDate = new Date(dateStr + 'T12:00:00');
  return tempDate.getUTCDay();
}

/**
 * Format date for display in Malaysian format
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatMalaysianDateForDisplay(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  return new Intl.DateTimeFormat('en-MY', {
    ...options,
    timeZone: MALAYSIA_TIMEZONE
  }).format(date);
}

/**
 * Parse various date formats into a consistent Date object
 * Handles: Date objects, YYYY-MM-DD strings, ISO strings
 * 
 * @param dateInput - Date in various formats
 * @returns Date object or null if invalid
 */
export function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  
  // Already a Date object
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // String input
  if (typeof dateInput === 'string') {
    // YYYY-MM-DD format (preferred)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return parseDateStringAsMYT(dateInput);
    }
    
    // ISO string or other formats
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * Compare two dates in Malaysian timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareMalaysianDates(date1: Date, date2: Date): number {
  const str1 = formatDateAsMYT(date1);
  const str2 = formatDateAsMYT(date2);
  
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}

/**
 * Check if a date is today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is today in Malaysia
 */
export function isMalaysianToday(date: Date): boolean {
  return isSameMalaysianDate(date, getMalaysianNow());
}

/**
 * Check if a date is before today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is before today in Malaysia
 */
export function isBeforeMalaysianToday(date: Date): boolean {
  return compareMalaysianDates(date, getMalaysianNow()) < 0;
}

/**
 * Check if a date is after today in Malaysian timezone
 * 
 * @param date - Date to check
 * @returns true if date is after today in Malaysia
 */
export function isAfterMalaysianToday(date: Date): boolean {
  return compareMalaysianDates(date, getMalaysianNow()) > 0;
}
