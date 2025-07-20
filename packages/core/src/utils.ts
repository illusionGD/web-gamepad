export function uniqueArray(arr: any[]) {
  return [...new Set(arr)];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
