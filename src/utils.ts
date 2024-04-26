/** Library of helper functions that don't quite fit anywhere else. **/

/**
 * Given a list of numbers describing the right-most boundaries (inclusive) of a set of partitions, a list of values
 * contained in those partitions, and a lookup key, return the value contained in the partition specified by the key.
 *
 * The number of values must match the number of partitions, and the key must match an existing partition, or else an
 * error will be thrown.
 *
 * For example, with partitions [2, 5, 10] and values [1, 2, 3], keys 1-2 yield 1, 3-5 yield 2, and 6-10 yield 3. A key
 * greater than 10 would yield an error.
 */
export function getPartitionedValue (key: number, partitions: number[], values: number[]): number {
  if (partitions.length !== values.length) {
    throw new Error(
      `There must be only one value in every partition. Got ${values.length} values in ${partitions.length} partitions.`
    )
  }

  for (let i = 0; i < partitions.length; i++) {
    if (key <= partitions[i]) {
      return values[i]
    }
  }

  throw new Error(`The key ${key} does not match any partition boundary. Make sure there is a bucket for every key.`)
}

const SCORE_BUCKETS = [10, 33, 56, 79, 102, 126, 151, 178, 207, 236, 270, 308, 352, 409, 499, Number.MAX_SAFE_INTEGER]
const WINNER_HIGHER = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const WINNER_LOWER = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]

/**
 * Compute the change in ELO given the ratings of two players, a winner and a loser. ELO is zero-sum, so this function
 * returns a single value (to be added to the winner's score, and subtracted from the loser's.)
 */
export function computeEloDiff (winnerRating: number, loserRating: number): number {
  const scoreAdjustments = winnerRating < loserRating ? WINNER_LOWER : WINNER_HIGHER
  const scoreDiff = Math.abs(winnerRating - loserRating)
  return getPartitionedValue(scoreDiff, SCORE_BUCKETS, scoreAdjustments)
}
