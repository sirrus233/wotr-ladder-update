import { Competitive, LadderRow, ReportRow, Victory } from './types'

const SCORE_BUCKETS = [10, 33, 56, 79, 102, 126, 151, 178, 207, 236, 270, 308, 352, 409, 499, Number.MAX_SAFE_INTEGER]
const WINNER_HIGHER = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const WINNER_LOWER = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]

function getPartitionedValue (key: number, partitions: number[], values: number[]): number {
  if (partitions.length !== values.length) {
    throw new Error(`
    There must be exactly one value in every partition. 
    There are ${partitions.length} partitions and ${values.length} values.
    `)
  }

  for (let i = 0; i < partitions.length; i++) {
    if (key <= partitions[i]) {
      return values[i]
    }
  }

  throw new Error(`The key ${key} does not match any partition boundary. Make sure there is a bucket for every key.`)
}

export class WotrReport {
  row: ReportRow
  winner: string
  loser: string
  victory: Victory
  competitive: Competitive
  annotation: Annotation = [0, 0, 0, 0, 0, 0, 0, 0]

  constructor (row: ReportRow) {
    this.row = row
    this.winner = row[2].trim()
    this.loser = row[3].trim()
    this.victory = row[5]
    this.competitive = row[6]
  }

  isLadderGame (): boolean {
    return this.competitive.startsWith('Ladder')
  }

  hasStats (): boolean {
    return this.competitive !== 'Ladder but I cannot remember the stats'
  }

  winningSide (): Side {
    return this.victory.includes('Shadow') || this.victory.includes('SP') ? 'Shadow' : 'Free'
  }

  losingSide (): Side {
    return this.winningSide() === 'Shadow' ? 'Free' : 'Shadow'
  }
}

type Side = 'Shadow' | 'Free'
type Annotation = [
  winnerGamesPlayed: number,
  winnerRank: number,
  winnerRatingBefore: number,
  winnerRatingAfter: number,
  loserGamesPlayed: number,
  loserRank: number,
  loserRatingBefore: number,
  loserRatingAfter: number
]

export class WotrLadderEntry {
  name: string
  normalizedName: string
  shadowRating: number
  freeRating: number
  gamesPlayed: number

  constructor (row: LadderRow) {
    this.name = row[2].trim()
    this.normalizedName = this.name.toLowerCase()
    this.shadowRating = row[4]
    this.freeRating = row[5]
    this.gamesPlayed = row[6]
  }

  getRating (side: Side): number {
    return side === 'Shadow' ? this.shadowRating : this.freeRating
  }

  setRating (side: Side, value: number): void {
    if (side === 'Shadow') {
      this.shadowRating = value
    } else {
      this.freeRating = value
    }
  }

  avgRating (): number {
    return (this.shadowRating + this.freeRating) / 2
  }
}

export class WotrLadder {
  originalEntries: WotrLadderEntry[]
  entries: WotrLadderEntry[]
  entryMap: Map<string, WotrLadderEntry>

  constructor (entries: WotrLadderEntry[]) {
    this.originalEntries = [...entries]
    this.entries = entries
    this.entryMap = new Map(entries.map((entry) => [entry.normalizedName, entry]))
  }

  has (name: string): boolean {
    const normalizedName = name.trim().toLowerCase()
    return this.entryMap.has(normalizedName)
  }

  getEntry (name: string): WotrLadderEntry | undefined {
    const normalizedName = name.trim().toLowerCase()
    return this.entryMap.get(normalizedName)
  }

  getRank (name: string): number {
    const normalizedName = name.trim().toLowerCase()
    const rank = this.entries.findIndex((entry) => entry.normalizedName === normalizedName)
    if (rank < 0) {
      throw new Error(`No entry in ladder for player ${name}`)
    }
    return rank + 1 // +1 accounts for zero-indexing of the array
  }

  addPlayer (name: string): WotrLadderEntry {
    const entry = new WotrLadderEntry([0, '', name, 500, 500, 500, 0])
    this.entries.push(entry)
    this.originalEntries.push(entry)
    this.entryMap.set(entry.normalizedName, entry)
    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
    return entry
  }

  processReport (report: WotrReport): void {
    const winner = this.getEntry(report.winner) ?? this.addPlayer(report.winner)
    const loser = this.getEntry(report.loser) ?? this.addPlayer(report.loser)

    const winningSide = report.winningSide()
    const losingSide = report.losingSide()

    // Pre-game stats, for annotation purposes
    const oldWinnerGamesPlayed = winner.gamesPlayed
    const oldWinnerRank = this.getRank(winner.name)
    const oldWinnerRating = winner.getRating(winningSide)

    const oldLoserGamesPlayed = loser.gamesPlayed
    const oldLoserRank = this.getRank(loser.name)
    const oldLoserRating = winner.getRating(losingSide)

    // Calculate the ELO difference
    const scoreAdjustments = oldWinnerRating < oldLoserRating ? WINNER_LOWER : WINNER_HIGHER
    const scoreDiff = Math.abs(oldWinnerRating - oldLoserRating)
    const scoreAdjustment = getPartitionedValue(scoreDiff, SCORE_BUCKETS, scoreAdjustments)

    // Adjust player ratings and re-sort the ladder
    winner.setRating(winningSide, oldWinnerRating + scoreAdjustment)
    loser.setRating(losingSide, oldLoserRating - scoreAdjustment)
    winner.gamesPlayed += 1
    loser.gamesPlayed += 1
    this.entries.sort((a, b) => b.avgRating() - a.avgRating())

    const newWinnerRating = winner.getRating(winningSide)
    const newLoserRating = loser.getRating(losingSide)

    const annotation: Annotation = [
      oldWinnerGamesPlayed,
      oldWinnerRank,
      oldWinnerRating,
      newWinnerRating,
      oldLoserGamesPlayed,
      oldLoserRank,
      oldLoserRating,
      newLoserRating
    ]
    report.annotation = annotation
  }
}
