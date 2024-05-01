/**
 * Helper library for providing strong typing to the spreadsheet. See the supporting modules in this directory
 * for game-specific types.
 */

/** A function which maps an unknown value to a concretely typed one. */
type Parser<T> = (val: unknown) => T | null

/** Factory function to create a Parser for a type union of literals, given an array of the union's variants.  */
export function unionParser<T> (variants: readonly T[]): Parser<T> {
  return (val: unknown) => (variants.includes(val as T) ? (val as T) : null)
}

/** A function which takes a parser and returns a new function that is a safe type guard for T. */
export const createTypeGuard =
  <T>(parse: Parser<T>) =>
    (value: unknown): value is T => {
      return parse(value) !== null
    }
