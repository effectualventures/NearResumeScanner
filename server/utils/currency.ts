/**
 * Currency conversion utility
 * 
 * Static conversion rates for common Latin American currencies to USD
 * Note: In a production app, this would use a currency API, but
 * as per requirements, we're using static rates for simplicity
 */

// Mapping of currency codes to conversion rates (to USD)
const CURRENCY_RATES: Record<string, number> = {
  MXN: 0.055,  // Mexican Peso
  BRL: 0.19,   // Brazilian Real
  ARS: 0.0028, // Argentine Peso
  COP: 0.00025, // Colombian Peso
  CLP: 0.0011, // Chilean Peso
  PEN: 0.27,   // Peruvian Sol
  UYU: 0.025,  // Uruguayan Peso
  BOB: 0.14,   // Bolivian Boliviano
  VES: 0.00001, // Venezuelan Bolívar
  PYG: 0.00014, // Paraguayan Guaraní
  GTQ: 0.13,   // Guatemalan Quetzal
  DOP: 0.018,  // Dominican Peso
  HNL: 0.041,  // Honduran Lempira
  NIO: 0.027,  // Nicaraguan Córdoba
  CRC: 0.0019, // Costa Rican Colón
  PAB: 1,      // Panamanian Balboa (already USD)
};

// Currency symbol to code mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD', // Default for $, but context sensitive
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'R$': 'BRL',
  'MX$': 'MXN',
  'COP$': 'COP',
  'CLP$': 'CLP',
  'S/': 'PEN',
  'Bs': 'BOB',
  'Q': 'GTQ',
  'RD$': 'DOP',
  'L': 'HNL',
  'C$': 'NIO',
  '₡': 'CRC',
};

/**
 * Convert currency amount to USD
 * @param amount The original amount
 * @param currency The source currency code
 * @returns The equivalent amount in USD
 */
export function convertToUSD(amount: number, currency: string): number {
  if (currency === 'USD') return amount;
  
  const rate = CURRENCY_RATES[currency];
  if (!rate) {
    console.warn(`No conversion rate found for ${currency}, using 1:1`);
    return amount;
  }
  
  return amount * rate;
}

/**
 * Format currency for display
 * @param amount The amount to format
 * @param isUSD Whether this is already in USD
 * @returns Formatted string
 */
export function formatCurrencyAmount(amount: number, isUSD = false): string {
  if (amount >= 1_000_000_000) {
    return `${Math.round(amount / 1_000_000_000)}B`;
  }
  if (amount >= 1_000_000) {
    return `${Math.round(amount / 1_000_000)}M`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}K`;
  }
  return amount.toString();
}

/**
 * Parse a currency string into amount and currency code
 * @param text The text containing currency
 * @returns Object with amount and currency code if found
 */
export function parseCurrency(text: string): { amount: number; currency: string } | null {
  // Regular expression to match currency patterns
  // Matches patterns like "$1000", "1000 USD", "R$1000", "1000 pesos", etc.
  const currencyRegex = /(\D*)(\d[\d\s,.]+)(\s*[A-Za-z]+)?/;
  const match = text.match(currencyRegex);
  
  if (!match) return null;
  
  const prefix = match[1]?.trim() || '';
  const amountStr = match[2].replace(/[\s,]/g, '');
  const suffix = match[3]?.trim() || '';
  
  // Parse amount
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) return null;
  
  // Determine currency
  let currency = 'USD'; // Default
  
  // Check prefix for currency symbol
  if (prefix) {
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (prefix.includes(symbol)) {
        currency = code;
        break;
      }
    }
  }
  
  // Check suffix for currency code or name
  if (suffix) {
    // First check if it's a direct currency code
    if (Object.keys(CURRENCY_RATES).includes(suffix.toUpperCase())) {
      currency = suffix.toUpperCase();
    }
    // Then check common currency names
    else if (suffix.toLowerCase().includes('peso')) {
      // Determine which peso based on context (could be improved)
      currency = 'MXN'; // Default to Mexican Peso
    }
    else if (suffix.toLowerCase().includes('real')) {
      currency = 'BRL';
    }
    // Add more currency name mappings as needed
  }
  
  return { amount, currency };
}

/**
 * Convert and format a currency string to USD
 * @param text The original currency text
 * @returns Formatted text with USD equivalent
 */
export function convertAndFormatCurrency(text: string): string {
  const parsedCurrency = parseCurrency(text);
  if (!parsedCurrency) return text;
  
  const { amount, currency } = parsedCurrency;
  const usdAmount = convertToUSD(amount, currency);
  
  // Format both original and USD amounts
  const formattedOriginal = formatCurrencyAmount(amount);
  const formattedUSD = formatCurrencyAmount(usdAmount);
  
  // Construct the final string: "200M MXN ($11M USD)"
  return `${formattedOriginal} ${currency} ($${formattedUSD} USD)`;
}
