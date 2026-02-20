import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { formatDate, formatDuration } from './utils';

describe('formatDate', () => {
  // Unit tests for specific examples and edge cases
  test('formats valid Date object correctly', () => {
    const date = new Date('2026-02-03T10:30:00Z');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(formatted).toContain('2026');
  });

  test('formats valid ISO string correctly', () => {
    const isoString = '2026-02-03T10:30:00Z';
    const formatted = formatDate(isoString);
    expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    expect(formatted).toContain('2026');
  });

  test('returns "Unknown date" for null input', () => {
    expect(formatDate(null)).toBe('Unknown date');
  });

  test('returns "Unknown date" for undefined input', () => {
    expect(formatDate(undefined)).toBe('Unknown date');
  });

  test('returns "Invalid date" for invalid string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
    expect(formatDate('invalid')).toBe('Invalid date');
    expect(formatDate('2026-13-45')).toBe('Invalid date'); // Invalid month/day
  });

  // Feature: channel-detail-integration, Property 3: Date formatting consistency
  // Validates: Requirements 3.2, 3.3
  test('Property 3: Date formatting consistency - produces consistent format for all valid dates', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1900-01-01'),
          max: new Date('2100-12-31')
        }).filter(date => !isNaN(date.getTime())), // Only use valid dates
        (date) => {
          const formatted = formatDate(date);
          
          // Verify format matches "MMM DD, YYYY" pattern
          // MMM = 3-letter month abbreviation (Jan, Feb, Mar, etc.)
          // DD = 1-2 digit day (1-31)
          // YYYY = 4-digit year
          const dateFormatRegex = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
          
          expect(formatted).toMatch(dateFormatRegex);
          
          // Additional validation: verify the formatted date can be parsed back
          // and represents the same day (ignoring time)
          const parsedDate = new Date(formatted);
          expect(parsedDate.getFullYear()).toBe(date.getFullYear());
          expect(parsedDate.getMonth()).toBe(date.getMonth());
          expect(parsedDate.getDate()).toBe(date.getDate());
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: channel-detail-integration, Property 3: Date formatting consistency
  // Validates: Requirements 3.2, 3.3
  test('Property 3: Date formatting consistency - produces consistent format for ISO datetime strings', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1900-01-01'),
          max: new Date('2100-12-31')
        }).filter(date => !isNaN(date.getTime())), // Only use valid dates
        (date) => {
          // Convert to ISO string to test string input path
          const isoString = date.toISOString();
          const formatted = formatDate(isoString);
          
          // Verify format matches "MMM DD, YYYY" pattern
          const dateFormatRegex = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/;
          
          expect(formatted).toMatch(dateFormatRegex);
          
          // Verify consistency: formatting a Date object and its ISO string should produce the same result
          const formattedFromDate = formatDate(date);
          expect(formatted).toBe(formattedFromDate);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('formatDuration', () => {
  // Unit tests for specific examples and edge cases
  test('formats hours+minutes+seconds correctly', () => {
    expect(formatDuration('PT1H30M45S')).toBe('1h 30m 45s');
    expect(formatDuration('PT2H15M30S')).toBe('2h 15m 30s');
  });

  test('formats minutes+seconds correctly', () => {
    expect(formatDuration('PT4M13S')).toBe('4m 13s');
    expect(formatDuration('PT45M30S')).toBe('45m 30s');
  });

  test('formats seconds only correctly', () => {
    expect(formatDuration('PT45S')).toBe('45s');
    expect(formatDuration('PT5S')).toBe('5s');
    expect(formatDuration('PT0S')).toBe('0s');
  });

  test('returns "Unknown" for null input', () => {
    expect(formatDuration(null)).toBe('Unknown');
  });

  test('returns "Unknown" for undefined input', () => {
    expect(formatDuration(undefined)).toBe('Unknown');
  });

  test('returns original string for non-matching string', () => {
    expect(formatDuration('invalid')).toBe('invalid');
    expect(formatDuration('not-a-duration')).toBe('not-a-duration');
    expect(formatDuration('random-text')).toBe('random-text');
  });

  // Feature: codebase-refactor-lint, Property 1: formatDuration produces valid output for all ISO 8601 durations
  // Validates: Requirements 2.4, 6.3
  test('Property 1: formatDuration produces valid output for all ISO 8601 durations', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary ISO 8601 duration strings with hours, minutes, and seconds
        fc.record({
          hours: fc.nat({ max: 999 }), // YouTube videos can be very long
          minutes: fc.nat({ max: 59 }),
          seconds: fc.nat({ max: 59 })
        }).filter(({ hours, minutes, seconds }) => 
          // At least one component must be non-zero for valid duration
          hours > 0 || minutes > 0 || seconds > 0
        ),
        ({ hours, minutes, seconds }) => {
          // Construct ISO 8601 duration string
          let duration = 'PT';
          if (hours > 0) duration += `${hours}H`;
          if (minutes > 0) duration += `${minutes}M`;
          if (seconds > 0) duration += `${seconds}S`;
          
          const formatted = formatDuration(duration);
          
          // Property: Output should be non-empty
          expect(formatted).toBeTruthy();
          expect(formatted.length).toBeGreaterThan(0);
          
          // Property: Output should only contain digits, h/m/s letters, and spaces
          const validOutputRegex = /^[\dhms\s]+$/;
          expect(formatted).toMatch(validOutputRegex);
          
          // Property: Output should contain the expected components
          if (hours > 0) {
            expect(formatted).toContain('h');
            expect(formatted).toContain(hours.toString());
          }
          if (minutes > 0) {
            expect(formatted).toContain('m');
            expect(formatted).toContain(minutes.toString());
          }
          if (seconds > 0 || (hours === 0 && minutes === 0)) {
            expect(formatted).toContain('s');
          }
          
          // Property: Output should not contain the raw ISO format
          expect(formatted).not.toContain('PT');
          expect(formatted).not.toContain('H');
          expect(formatted).not.toContain('M');
          expect(formatted).not.toContain('S');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: codebase-refactor-lint, Property 2: formatDuration round-trip consistency
  // Validates: Requirements 2.4, 6.3
  test('Property 2: formatDuration round-trip consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          hours: fc.nat({ max: 23 }),
          minutes: fc.nat({ max: 59 }),
          seconds: fc.nat({ max: 59 })
        }).filter(({ hours, minutes, seconds }) => 
          // At least one component must be non-zero
          hours > 0 || minutes > 0 || seconds > 0
        ),
        ({ hours, minutes, seconds }) => {
          // Construct ISO 8601 duration string
          let duration = 'PT';
          if (hours > 0) duration += `${hours}H`;
          if (minutes > 0) duration += `${minutes}M`;
          if (seconds > 0) duration += `${seconds}S`;
          
          const formatted = formatDuration(duration);
          
          // Property: The formatted output should contain each non-zero component's numeric value
          if (hours > 0) {
            expect(formatted).toContain(hours.toString());
          }
          if (minutes > 0) {
            expect(formatted).toContain(minutes.toString());
          }
          if (seconds > 0) {
            expect(formatted).toContain(seconds.toString());
          }
          
          // Property: If all components are zero (filtered out), at least seconds should be present
          // This case is already filtered out by the filter above, so we don't need to test it
          
          // Property: The formatted string should be parseable back to verify consistency
          // Extract numbers from formatted string and verify they match original values
          const formattedParts = formatted.split(' ');
          
          for (const part of formattedParts) {
            if (part.endsWith('h')) {
              const extractedHours = parseInt(part.replace('h', ''));
              expect(extractedHours).toBe(hours);
            } else if (part.endsWith('m')) {
              const extractedMinutes = parseInt(part.replace('m', ''));
              expect(extractedMinutes).toBe(minutes);
            } else if (part.endsWith('s')) {
              const extractedSeconds = parseInt(part.replace('s', ''));
              expect(extractedSeconds).toBe(seconds);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
