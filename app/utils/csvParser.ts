export interface CSVRow {
  [key: string]: string; // Add this index signature
  RowType: string;
  Name: string;
  PadConn: string;
  Direction: string;
  Function: string;
  'Definition / Notes': string;
  VoltageMin: string;
  VoltageMax: string;
  Units: string;
  ESD_HBM_kV: string;
  ESD_CDM_V: string;
  Value: string;
  ValueUnits: string;
  Comments: string;
}

// Generic CSV parser that returns an array of objects with string keys
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