type Side = 'Shadow' | 'Free'

type Victory =
    | 'Free People Ring'
    | 'Free People Military'
    | 'Conceded FP won'
    | 'Shadow Forces Corruption'
    | 'Shadow Forces Military'
    | 'Conceded SP won'

type Competitive =
    | 'Friendly'
    | 'Ladder'
    | 'Ladder and tournament'
    | 'Ladder and league (general)'
    | 'Ladder and league (lome)'
    | 'Ladder and league (TTS)'
    | 'Ladder and league (wome)'
    | 'Ladder but I cannot remember the stats'

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

export class AnnotatedReport {
  report: WotrGameReport
  annotation: number[]

  constructor (report: WotrGameReport, annotation: number[]) {
    this.report = report
    this.annotation = annotation
  }
}

export class WotrGameReport {
  row: unknown[]
  winner: string
  loser: string
  victory: Victory
  competitive: Competitive

  constructor (row: unknown[]) {
    // TODO This happily assumes that the types are correct on the parsed data -- bad idea
    this.row = row
    this.winner = (row[2] as string).trim()
    this.loser = (row[3] as string).trim()
    this.victory = row[5] as Victory
    this.competitive = row[6] as Competitive
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

  process (ladder: WotrLadder): void {
    const winner = ladder.getEntry(this.winner)
    const loser = ladder.getEntry(this.loser)

    if (winner === undefined) {
      throw new Error(`Missing player from ladder: ${this.winner}.`)
    }

    if (loser === undefined) {
      throw new Error(`Missing player from ladder: ${this.loser}.`)
    }

    const winningSide = this.winningSide()
    const losingSide = this.losingSide()
    const winnerRating = winner.getRating(winningSide)
    const loserRating = loser.getRating(losingSide)

    const scoreAdjustments = winnerRating < loserRating ? WINNER_LOWER : WINNER_HIGHER
    const scoreDiff = Math.abs(winnerRating - loserRating)
    const scoreAdjustment = getPartitionedValue(scoreDiff, SCORE_BUCKETS, scoreAdjustments)

    winner.gamesPlayed += 1
    loser.gamesPlayed += 1

    ladder.updateRating(winner.normalizedName, winningSide, winnerRating + scoreAdjustment)
    ladder.updateRating(loser.normalizedName, losingSide, loserRating - scoreAdjustment)
  }
}

export class WotrLadderEntry {
  name: string
  normalizedName: string
  shadowRating: number
  freeRating: number
  gamesPlayed: number

  constructor (row: unknown[]) {
    // TODO This happily assumes that the types are correct on the parsed data -- bad idea
    this.name = (row[0] as string).trim()
    this.normalizedName = this.name.toLowerCase()
    this.shadowRating = row[1] as number
    this.freeRating = row[2] as number
    this.gamesPlayed = row[3] as number
  }

  getRating (side: Side): number {
    return side === 'Shadow' ? this.shadowRating : this.freeRating
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

  getEntry (name: string): WotrLadderEntry {
    const normalizedName = name.trim().toLowerCase()
    const entry = this.entryMap.get(normalizedName)
    if (entry === undefined) {
      throw new Error(`No entry in ladder for player ${name}`)
    }
    return entry
  }

  getRank (name: string): number {
    const normalizedName = name.trim().toLowerCase()
    const rank = this.entries.findIndex((entry) => entry.normalizedName === normalizedName)
    if (rank < 0) {
      throw new Error(`No entry in ladder for player ${name}`)
    }
    return rank + 1 // +1 accounts for zero-indexing of the array
  }

  addPlayer (name: string): void {
    const entry = new WotrLadderEntry([name, 500, 500, 0])
    this.entries.push(entry)
    this.originalEntries.push(entry)
    this.entryMap.set(entry.normalizedName, entry)
    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
  }

  updateRating (name: string, side: Side, value: number): void {
    const entry = this.getEntry(name)

    if (side === 'Shadow') {
      entry.shadowRating = value
    } else {
      entry.freeRating = value
    }

    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
  }
}
