export type CsvRow = string[];

export function parseCsv(input: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };

  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      pushField();
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) pushRow();

  if (quoted) {
    throw new Error('Malformed CSV: unterminated quoted field.');
  }

  return rows;
}

export function normaliseHeader(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[€$£]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function createHeaderIndex(headers: readonly string[]): Map<string, number> {
  const index = new Map<string, number>();

  headers.forEach((header, position) => {
    const key = normaliseHeader(header);
    if (key && !index.has(key)) index.set(key, position);
  });

  return index;
}

export function findColumn(
  headerIndex: ReadonlyMap<string, number>,
  aliases: readonly string[],
): number | undefined {
  for (const alias of aliases) {
    const position = headerIndex.get(normaliseHeader(alias));
    if (position !== undefined) return position;
  }
  return undefined;
}

export function readCell(
  row: readonly string[],
  headerIndex: ReadonlyMap<string, number>,
  aliases: readonly string[],
): string | undefined {
  const position = findColumn(headerIndex, aliases);
  if (position === undefined) return undefined;
  const value = row[position]?.trim();
  return value || undefined;
}

export function parsePositiveMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const cleaned = value
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9]/g, '');
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}
