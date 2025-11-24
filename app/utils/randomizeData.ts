// Utility function to shuffle an array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Randomize numeric values within a range
export function randomizeNumericValue(value: string, minPercent: number = 0.8, maxPercent: number = 1.2): string {
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

// Randomize priority values
export function randomizePriority(): string {
  const priorities = ['H', 'M', 'L'];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

// Randomize difficulty values
export function randomizeDifficulty(): string {
  const difficulties = ['H', 'M', 'L'];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}

// Randomize boolean-like values (Y/N)
export function randomizeBoolean(): string {
  return Math.random() > 0.5 ? 'Y' : 'N';
}






