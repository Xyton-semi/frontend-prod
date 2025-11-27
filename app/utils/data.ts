/**
 * Consolidated Data Utilities
 * CSV parsing and data randomization for demo purposes
 */

// ============================================================================
// CSV PARSING
// ============================================================================

export interface CSVRow {
  [key: string]: string;
}

/**
 * Generic CSV parser that returns an array of objects with string keys
 */
export function parseCSV<T extends Record<string, string> = Record<string, string>>(csvText: string): T[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue; // Skip empty lines
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row as T);
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted fields)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());
  return result;
}

// ============================================================================
// DATA RANDOMIZATION (for demo purposes)
// ============================================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Randomize numeric values within a range
 */
export function randomizeNumericValue(
  value: string, 
  minPercent: number = 0.8, 
  maxPercent: number = 1.2
): string {
  if (!value || value.trim() === '') return value;
  
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  
  const min = num * minPercent;
  const max = num * maxPercent;
  const randomized = min + Math.random() * (max - min);
  
  // Preserve decimal places if original had them
  const decimalPlaces = value.includes('.') ? value.split('.')[1].length : 0;
  return randomized.toFixed(decimalPlaces);
}

/**
 * Randomize priority values (H/M/L)
 */
export function randomizePriority(): string {
  const priorities = ['H', 'M', 'L'];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

/**
 * Randomize difficulty values (H/M/L)
 */
export function randomizeDifficulty(): string {
  const difficulties = ['H', 'M', 'L'];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}

/**
 * Randomize boolean-like values (Y/N)
 */
export function randomizeBoolean(): string {
  return Math.random() > 0.5 ? 'Y' : 'N';
}

/**
 * Load and parse a CSV file from a URL
 */
export async function loadCSV<T extends Record<string, string> = Record<string, string>>(
  url: string
): Promise<T[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    const text = await response.text();
    return parseCSV<T>(text);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
}