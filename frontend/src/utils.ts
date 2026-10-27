
export function groupBy<T, K extends string>(items: readonly T[], getKey: (item: T) => K): Partial<Record<K, T[]>> {
  const result: Partial<Record<K, T[]>> = {}
  for (const item of items) {
    const key = getKey(item)
    const bucket = result[key] ?? []
    bucket.push(item)
    result[key] = bucket
  }
  return result
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter((name): name is string => Boolean(name)).join(' ')
}

export function assertNever(value: never): never {
  throw new Error(`Необроблений варіант: ${JSON.stringify(value)}`)
}

export function hueOf(text: string): number {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}
