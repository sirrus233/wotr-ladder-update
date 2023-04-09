/** */

const DEFAULT_BATCH_SIZE = 25

export function queryBatchSize (): number {
  const response = prompt('Please enter a batch size.', DEFAULT_BATCH_SIZE.toString())
  if (response === null) {
    return DEFAULT_BATCH_SIZE
  }
  return parseInt(response)
}

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

export function computeEloDiff (winnerRating: number, loserRating: number): number {
  const scoreAdjustments = winnerRating < loserRating ? WINNER_LOWER : WINNER_HIGHER
  const scoreDiff = Math.abs(winnerRating - loserRating)
  return getPartitionedValue(scoreDiff, SCORE_BUCKETS, scoreAdjustments)
}
