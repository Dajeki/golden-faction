export type PropertiesOnly<T> = Pick<T, {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function  ? never : K
}[keyof T]>;