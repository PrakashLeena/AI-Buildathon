// Converts an array of plain objects into a CSV string for the admin export.
//
// This also guards against "CSV/formula injection": a well-known
// vulnerability where a cell value starting with =, +, -, or @ is parsed as
// a formula by Excel/Sheets when the exported file is opened. Since some of
// these values (team name, member names, ...) come from public registration
// form input, a malicious registrant could otherwise submit something like
// `=HYPERLINK("http://evil.example","click")` as their team name and have
// it turn into a live formula for whoever opens the export later. Every
// value that starts with a dangerous character is neutralised by prefixing
// a single quote, exactly like manually formatting a spreadsheet cell as
// plain text.
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function sanitizeCell(rawValue) {
  const str = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  const neutralized = DANGEROUS_PREFIXES.some((prefix) => str.startsWith(prefix)) ? `'${str}` : str;

  // Standard CSV quoting: wrap in quotes if the value contains a comma,
  // quote, or newline, doubling any internal quotes.
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

/**
 * @param {object[]} rows
 * @param {{ label: string, value: (row: object) => unknown }[]} columns
 */
export function toCsv(rows, columns) {
  const header = columns.map((col) => sanitizeCell(col.label)).join(',');
  const lines = rows.map((row) => columns.map((col) => sanitizeCell(col.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}
