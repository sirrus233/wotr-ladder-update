/**
 * Object models that represent spreadsheet concepts in an object-oriented form. The recommended usage of Google's
 * Sheet API is to read all required data, manipulate it in memory, and then write it back. These objects make the data
 * manipulation tasks easier than dealing with raw data Arrays.
 */
import { computeEloDiff } from './utils'
import { Annotation, Competitive, LadderRow, ReportRow, Side, Victory } from './types'

/** Representation of a single game report. */
export class WotrReport {
  /** The report as read from the spreadsheet in Array/Tuple form. */
  row: ReportRow
  /** Name of the winner. */
  winner: string
  /** Name of the loser. */
  loser: string
  /** Victory type. */
  victory: Victory
  /** Whether or not the game was competitive/friendly. */
  competitive: Competitive
  /** Annotation data for ladder managers. Initialized to a default state, and updated when this report is processed. */
  annotation: Annotation = [0, 0, 0, 0, 0, 0, 0, 0]

  constructor (row: ReportRow) {
    this.row = row
    this.winner = row[2]
    this.loser = row[3]
    this.victory = row[5]
    this.competitive = row[6]
  }

  /** Was this game played competitively */
  isLadderGame (): boolean {
    return this.competitive.startsWith('Ladder')
  }

  /** Are stats known for this game */
  hasStats (): boolean {
    return this.competitive !== 'Ladder but I cannot remember the stats'
  }

  /** Which side won */
  winningSide (): Side {
    return this.victory.includes('Shadow') || this.victory.includes('SP') ? 'Shadow' : 'Free'
  }

  /** Which side lost */
  losingSide (): Side {
    return this.winningSide() === 'Shadow' ? 'Free' : 'Shadow'
  }
}

/** Representation of a single player's stats on the ladder. */
export class WotrLadderEntry {
  /** The player's name. */
  name: string
  /** The player's name, normalized for lookup. */
  normalizedName: string
  /** The player's Shadow rating. */
  shadowRating: number
  /** The player's Free rating. */
  freeRating: number
  /** The player's total number of games played (all time). */
  gamesPlayed: number

  constructor (row: LadderRow) {
    this.name = row[2]
    this.normalizedName = this.name.toLowerCase()
    this.shadowRating = row[4]
    this.freeRating = row[5]
    this.gamesPlayed = row[6]
  }

  /** Return this player's rating for a particular Side. */
  getRating (side: Side): number {
    return side === 'Shadow' ? this.shadowRating : this.freeRating
  }

  /** Set this player's rating for a particular Side to a given value. */
  setRating (side: Side, value: number): void {
    if (side === 'Shadow') {
      this.shadowRating = value
    } else {
      this.freeRating = value
    }
  }

  /** Return the player's average rating between the two sides. */
  avgRating (): number {
    return (this.shadowRating + this.freeRating) / 2
  }
}

/** Representation of the entire ladder system. */
export class WotrLadder {
  /**
   * Ladder entries in the order they were processed from the Google Sheet. New entries may be appended to this
   * Array if games with new players are processed, but the relative order is never changed.
   */
  originalEntries: WotrLadderEntry[]
  /** Ladder entries sorted by ranked order (e.g. highest rated player first, etc.). */
  entries: WotrLadderEntry[]
  /** Lookup table for ladder entries, keyed by normalized player name. */
  entryMap: Map<string, WotrLadderEntry>

  constructor (entries: WotrLadderEntry[]) {
    this.originalEntries = [...entries]
    this.entries = entries
    this.entryMap = new Map(entries.map((entry) => [entry.normalizedName, entry]))
  }

  /**
   * Get the ladder entry associated with a given player name. The name will be normalized prior to performing the
   * lookup. If the player does not exist in the ladder, this function returns undefined.
   */
  getEntry (name: string): WotrLadderEntry | undefined {
    const normalizedName = name.toLowerCase()
    return this.entryMap.get(normalizedName)
  }

  /**
   * Get the ladder rank associated with a given player name. The name will be normalized prior to performing the
   * lookup. If the player does not exist in the ladder, this function throws an error.
   */
  getRank (name: string): number {
    const normalizedName = name.toLowerCase()
    const rank = this.entries.findIndex((entry) => entry.normalizedName === normalizedName)
    if (rank < 0) {
      throw new Error(`No entry in ladder for player ${name}`)
    }
    return rank + 1 // +1 accounts for zero-indexing of the array
  }

  /**
   * Add a new player to the ladder in the default position (Rating: 500|500). This has the side effect of appending
   * the new player to the originalEntries Array.
   */
  addPlayer (name: string): WotrLadderEntry {
    const entry = new WotrLadderEntry([0, '', name, 500, 500, 500, 0])
    this.entries.push(entry)
    this.originalEntries.push(entry)
    this.entryMap.set(entry.normalizedName, entry)
    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
    return entry
  }

  /**
   * Process a game report, adjusting all ladder ranking/ratings accordingly. This also mutates the original report,
   * by adding ladder manager annotations. Annotations are based on pre-game stats (with the exception of the post-game
   * rating).
   */
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
