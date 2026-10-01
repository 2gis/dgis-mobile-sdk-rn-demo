export function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0';
}
