import { computeEloDiff } from './lib'
import { Annotation, Competitive, LadderRow, ReportRow, Side, Victory } from './types'

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

    const scoreChange = computeEloDiff(oldWinnerRating, oldLoserRating)

    // Adjust player ratings and re-sort the ladder
    winner.setRating(winningSide, oldWinnerRating + scoreChange)
    loser.setRating(losingSide, oldLoserRating - scoreChange)
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
