export function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
}

export function partition<T>(arr: T[], pred: (item: T) => boolean): { pass: T[]; fail: T[] } {
    const pass: T[] = [], fail: T[] = []
    for (const item of arr) (pred(item) ? pass : fail).push(item)
    return { pass, fail }
}
