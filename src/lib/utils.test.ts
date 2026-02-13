import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { formatDate } from './utils';

describe('formatDate', () => {
  // Feature: channel-detail-integration, Property 3: Date formatting consistency
  // Validates: Requirements 3.2, 3.3
  test('Property 3: Date formatting consistency - produces consistent format for all valid dates', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1900-01-01'),
          max: new Date('2100-12-31')
        }),
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
