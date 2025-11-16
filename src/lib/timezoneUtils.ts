/**
 * Get the current date in the user's preferred timezone
 * @param timezone - 'local' for browser timezone or IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDate(timezone: string = 'local'): string {
  if (timezone === 'local') {
    // Use browser's local timezone - simply get the local date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Use specific timezone
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Invalid timezone, falling back to local:', error);
    return getCurrentDate('local');
  }
}

/**
 * Get the current date and time formatted for display
 * @param timezone - 'local' for browser timezone or IANA timezone string
 * @returns Formatted date and time string
 */
export function getCurrentDateTime(timezone: string = 'local'): string {
  if (timezone === 'local') {
    return new Date().toLocaleString();
  }
  
  try {
    return new Date().toLocaleString('en-US', { timeZone: timezone });
  } catch (error) {
    console.error('Invalid timezone, falling back to local:', error);
    return new Date().toLocaleString();
  }
}

/**
 * Get common timezones for the select dropdown
 */
export const commonTimezones = [
  { value: 'local', label: 'Local (Browser Timezone)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
];
