/**
 * Date formatting utilities
 */

/**
 * Formats a date string to a localized, human-readable format
 * Example output: "Jan 15, 2024, 02:30 PM"
 *
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
