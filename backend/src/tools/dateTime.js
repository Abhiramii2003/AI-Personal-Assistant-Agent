/**
 * Date & Time Tool
 * 
 * Provides accurate current temporal information:
 * - Current Date (e.g., Tuesday, September 1, 2026)
 * - Current Time (12-hour and 24-hour formats)
 * - Day of the Week
 * - Timezone information
 */

/**
 * Returns structured current date and time information
 * @returns {object} Temporal data object
 */
function getCurrentDateTime() {
  const now = new Date();

  // Format options
  const dateOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const timeOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };

  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  const isoString = now.toISOString();

  // Timezone information
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const timeZoneOffset = now.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(timeZoneOffset / 60));
  const offsetMins = Math.abs(timeZoneOffset % 60);
  const offsetSign = timeZoneOffset <= 0 ? '+' : '-';
  const formattedOffset = `UTC${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

  return {
    success: true,
    dayOfWeek,
    date: formattedDate,
    time: formattedTime,
    timeZone: `${timeZone} (${formattedOffset})`,
    iso: isoString,
    summary: `Today is ${dayOfWeek}, ${formattedDate}. The current time is ${formattedTime} (${timeZone}).`
  };
}

module.exports = {
  getCurrentDateTime
};
