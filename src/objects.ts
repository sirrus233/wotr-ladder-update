/**
 * Object models that represent spreadsheet concepts in an object-oriented form. The recommended usage of Google's
 * Sheet API is to read all required data, manipulate it in memory, and then write it back. These objects make the data
 * manipulation tasks easier than dealing with raw data Arrays.
 */
import { computeEloDiff } from './utils'
import { Annotation, WotrCompetitive, WotrLadderRow, WotrReportRow, WotrSide, WotrVictory } from './types/wotrTypes'
import { CardCompetitive, CardLadderRow, CardReportRow, CardRole, CardSide, CardWinner } from './types/cardGameTypes'

/** Representation of a single game report. */
export class WotrReport {
  /** The report as read from the spreadsheet in Array/Tuple form. */
  row: WotrReportRow
  /** Name of the winner. */
  winner: string
  /** Name of the loser. */
  loser: string
  /** Victory type. */
  victory: WotrVictory
  /** Whether or not the game was competitive/friendly. */
  competitive: WotrCompetitive
  /** Annotation data for ladder managers. Initialized to a default state, and updated when this report is processed. */
  annotation: Annotation = [0, 0, 0, 0, 0, 0, 0, 0]

  constructor (row: WotrReportRow) {
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
  winningSide (): WotrSide {
    return this.victory.includes('Shadow') || this.victory.includes('SP') ? 'Shadow' : 'Free'
  }

  /** Which side lost */
  losingSide (): WotrSide {
    return this.winningSide() === 'Shadow' ? 'Free' : 'Shadow'
  }
}

/** Representation of a single game report. */
export class CardReport {
  /** The report as read from the spreadsheet in Array/Tuple form. */
  row: CardReportRow
  /** Whether or not the game was competitive/friendly. */
  competitive: CardCompetitive
  /** Which side won */
  victory: CardWinner

  constructor (row: CardReportRow) {
    this.row = row
    this.competitive = row[5]
    this.victory = row[6]
  }

  /** Was this game played competitively */
  isLadderGame (): boolean {
    return this.competitive.startsWith('Ladder') && this.victory !== 'Two Tower / Return of the King'
  }

  /** Which side won */
  winningSide (): CardSide {
    switch (this.victory) {
      case 'FP':
        return 'Free'
      case 'SP':
        return 'Shadow'
    }
    throw new Error(`Cannot process a ladder game with unknown victory type: ${this.victory}`)
  }

  /** Which side lost */
  losingSide (): CardSide {
    switch (this.winningSide()) {
      case 'Free':
        return 'Shadow'
      case 'Shadow':
        return 'Free'
    }
  }

  /** Which player played a particular role */
  getPlayer (role: CardRole): string {
    switch (role) {
      case 'WitchKing':
        return this.row[1]
      case 'Saruman':
        return this.row[2]
      case 'Frodo':
        return this.row[3]
      case 'Aragorn':
        return this.row[4]
    }
  }

  /** How many unique players played this game */
  playerCount (): number {
    return new Set([
      this.row[1].toLowerCase(),
      this.row[2].toLowerCase(),
      this.row[3].toLowerCase(),
      this.row[4].toLowerCase()
    ]).size
  }
}

/** Representation of a single player's stats on the ladder. */
abstract class LadderEntry {
  /** The player's name. */
  abstract name: string

  /**
   * Return the player's average rating, used for overall ladder rank. This should be computed from the side/role fields
   * rather than read directly from the "rating" field of the row, since that is generally computed on the spreadsheet,
   * and will not have its value changed as part of the ladder processing process.
   */
  abstract avgRating (): number
}

export class WotrLadderEntry extends LadderEntry {
  /** The player's name. */
  name: string
  /** The player's Shadow rating. */
  shadowRating: number
  /** The player's Free rating. */
  freeRating: number
  /** The player's total number of games played (all time). */
  gamesPlayed: number

  constructor (row: WotrLadderRow) {
    super()
    this.name = row[2]
    this.shadowRating = row[4]
    this.freeRating = row[5]
    this.gamesPlayed = row[6]
  }

  avgRating (): number {
    return (this.shadowRating + this.freeRating) / 2
  }

  /** Return this player's rating for a particular Side. */
  getRating (side: WotrSide): number {
    return side === 'Shadow' ? this.shadowRating : this.freeRating
  }

  /** Set this player's rating for a particular Side to a given value. */
  setRating (side: WotrSide, value: number): void {
    if (side === 'Shadow') {
      this.shadowRating = value
    } else {
      this.freeRating = value
    }
  }
}

export class CardLadderEntry extends LadderEntry {
  /** A row read directly from the ladder sheet in Array/Tuple form. */
  row: CardLadderRow
  /** The player's name. */
  name: string

  constructor (row: CardLadderRow) {
    super()
    this.row = row
    this.name = row[2]
  }

  avgRating (): number {
    const ratings =
      this.getRoleRating('WitchKing') +
      this.getRoleRating('Saruman') +
      this.getRoleRating('Frodo') +
      this.getRoleRating('Aragorn')

    return ratings / 4
  }

  /** Return this player's rating for a particular Role. */
  getRoleRating (role: CardRole): number {
    switch (role) {
      case 'WitchKing':
        return this.row[4]
      case 'Saruman':
        return this.row[5]
      case 'Frodo':
        return this.row[6]
      case 'Aragorn':
        return this.row[7]
    }
  }

  /** Return this player's rating for a particular Side. */
  getSideRating (side: CardSide): number {
    switch (side) {
      case 'Free':
        return (this.getRoleRating('Frodo') + this.getRoleRating('Aragorn')) / 2
      case 'Shadow':
        return (this.getRoleRating('WitchKing') + this.getRoleRating('Saruman')) / 2
    }
  }

  /** Set this player's rating for a particular Role to a given value. */
  setRating (role: CardRole, value: number): void {
    switch (role) {
      case 'WitchKing':
        this.row[4] = value
        break
      case 'Saruman':
        this.row[5] = value
        break
      case 'Frodo':
        this.row[6] = value
        break
      case 'Aragorn':
        this.row[7] = value
        break
    }
  }

  /** Increase number of games for a particular player count (e.g. 4-player games played) */
  incrementTotalGameCount (playerCount: number): void {
    switch (playerCount) {
      case 4:
        this.row[10] += 1
        this.row[11] += 1
        break
      case 3:
        this.row[10] += 1
        this.row[12] += 1
        break
      case 2:
        this.row[10] += 1
        this.row[13] += 1
        break
      default:
        throw new Error(`Invalid player count: ${playerCount}`)
    }
  }

  /** Increase number of games for a particular player count (e.g. 4-player games played) */
  incrementRoleGameCount (role: CardRole): void {
    switch (role) {
      case 'WitchKing':
        this.row[15] += 1
        break
      case 'Saruman':
        this.row[17] += 1
        break
      case 'Frodo':
        this.row[19] += 1
        break
      case 'Aragorn':
        this.row[21] += 1
        break
    }
  }

  /** Increase number of wins for a particular role */
  incrementWinCount (role: CardRole): void {
    switch (role) {
      case 'WitchKing':
        this.row[16] += 1
        break
      case 'Saruman':
        this.row[18] += 1
        break
      case 'Frodo':
        this.row[20] += 1
        break
      case 'Aragorn':
        this.row[22] += 1
        break
    }
  }
}

/** Representation of the entire ladder system. */
abstract class Ladder<T extends LadderEntry> {
  /**
   * Ladder entries in the order they were processed from the Google Sheet. New entries may be appended to this
   * Array if games with new players are processed, but the relative order is never changed.
   */
  originalEntries: T[]
  /** Ladder entries sorted by ranked order (e.g. highest rated player first). Does not include inactive players. */
  entries: T[]
  /** Lookup table for ladder entries, keyed by normalized player name. */
  entryMap: Map<string, T>

  constructor (entries: T[]) {
    this.originalEntries = [...entries]
    const notActiveMarkerIndex = entries.map((entry) => entry.name).indexOf('NOT ACTIVE PLAYERS')
    this.entries = notActiveMarkerIndex < 0 ? entries : this.entries = entries.slice(0, notActiveMarkerIndex)
    this.entryMap = new Map(entries.map((entry) => [this.normalize(entry.name), entry]))
  }

  /** Return a name, normalized for lookup in the ladder */
  normalize (name: string): string {
    return name.toLowerCase()
  }

  /** Return an initialized new ladder entry, for this ladder */
  abstract getDefaultEntry (name: string): T

  /**
   * Get the ladder entry associated with a given player name. The name will be normalized prior to performing the
   * lookup. If the player does not exist in the ladder, this function returns undefined.
   */
  getEntry (name: string): T | undefined {
    return this.entryMap.get(this.normalize(name))
  }

  /**
   * Get the ladder rank associated with a given player name. The name will be normalized prior to performing the
   * lookup. If the player does not exist in the ladder, this function throws an error.
   */
  getRank (name: string): number {
    const normalizedName = this.normalize(name)
    const rank = this.entries.findIndex((entry) => this.normalize(entry.name) === normalizedName)
    // +1 accounts for zero-indexing of the array
    // Players not found in the sorted entries (inactive players) will show a rank of 0
    return rank + 1
  }

  /**
   * Add a new player to the ladder in the default position (Rating: 500|500). This has the side effect of appending
   * the new player to the originalEntries Array.
   */
  addPlayer (name: string): T {
    const entry = this.getDefaultEntry(name)
    this.entries.push(entry)
    this.originalEntries.push(entry)
    this.entryMap.set(this.normalize(name), entry)
    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
    return entry
  }
}

export class WotrLadder extends Ladder<WotrLadderEntry> {
  /** Return an initialized new ladder entry, for this ladder */
  getDefaultEntry (name: string): WotrLadderEntry {
    return new WotrLadderEntry([0, '', name, 500, 500, 500, 0])
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
    const oldLoserRating = loser.getRating(losingSide)

    const scoreChange = computeEloDiff(oldWinnerRating, oldLoserRating)

    console.log(`Winner was ${winner.name} playing ${winningSide} with a rating of ${oldWinnerRating}`)
    console.log(`Loser was ${loser.name} playing ${losingSide} with a rating of ${oldLoserRating}`)
    console.log(`ELO diff will be ${scoreChange}`)

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

export class CardLadder extends Ladder<CardLadderEntry> {
  /** Return an initialized new ladder entry, for this ladder */
  getDefaultEntry (name: string): CardLadderEntry {
    return new CardLadderEntry([0, '', name, 500, 500, 500, 500, 500, 500, 500, 0, 0, 0, 0, '', 0, 0, 0, 0, 0, 0, 0, 0])
  }

  /** Process a game report, adjusting all ladder ranking/ratings accordingly. */
  processReport (report: CardReport): void {
    const winningSide = report.winningSide()
    const losingSide = report.losingSide()

    const winningRole1: CardRole = winningSide === 'Shadow' ? 'WitchKing' : 'Frodo'
    const winningRole2: CardRole = winningSide === 'Shadow' ? 'Saruman' : 'Aragorn'
    const losingRole1: CardRole = losingSide === 'Shadow' ? 'WitchKing' : 'Frodo'
    const losingRole2: CardRole = losingSide === 'Shadow' ? 'Saruman' : 'Aragorn'

    // Always 2 winners and 2 losers, even if fewer than 4 players.
    // If there was a single player on the winning side, then both winners are just the same person.
    const winner1 = this.getEntry(report.getPlayer(winningRole1)) ?? this.addPlayer(report.getPlayer(winningRole1))
    const winner2 = this.getEntry(report.getPlayer(winningRole2)) ?? this.addPlayer(report.getPlayer(winningRole2))
    const loser1 = this.getEntry(report.getPlayer(losingRole1)) ?? this.addPlayer(report.getPlayer(losingRole1))
    const loser2 = this.getEntry(report.getPlayer(losingRole2)) ?? this.addPlayer(report.getPlayer(losingRole2))

    const winner1Rating = winner1.getRoleRating(winningRole1)
    const winner2Rating = winner2.getRoleRating(winningRole2)
    const winningTeamRating = (winner1Rating + winner2Rating) / 2

    const loser1Rating = loser1.getRoleRating(losingRole1)
    const loser2Rating = loser2.getRoleRating(losingRole2)
    const losingTeamRating = (loser1Rating + loser2Rating) / 2

    const scoreChange = computeEloDiff(winningTeamRating, losingTeamRating)

    console.log(
      `Winners were ${winner1.name} and ${winner2.name} playing ${winningSide} with a rating of ${winningTeamRating}`
    )
    console.log(
      `Losers were ${loser1.name} and ${loser2.name} playing ${losingSide} with a rating of ${losingTeamRating}`
    )
    console.log(`ELO diff will be ${scoreChange}`)

    // Adjust player ratings and re-sort the ladder
    // When both players on a side are the same person, they get the Elo adjustment to both roles
    winner1.setRating(winningRole1, winner1Rating + scoreChange)
    winner2.setRating(winningRole2, winner2Rating + scoreChange)
    loser1.setRating(losingRole1, loser1Rating - scoreChange)
    loser2.setRating(losingRole2, loser2Rating - scoreChange)

    const playerCount = report.playerCount()
    // Make sure we don't double-update win data when winner1 and winner2 are the same person
    winner1.incrementWinCount(winningRole1)
    winner1.incrementRoleGameCount(winningRole1)
    winner1.incrementTotalGameCount(playerCount)

    winner2.incrementWinCount(winningRole2)
    winner2.incrementRoleGameCount(winningRole2)
    if (this.normalize(winner1.name) !== this.normalize(winner2.name)) {
      winner2.incrementTotalGameCount(playerCount)
    }

    loser1.incrementRoleGameCount(losingRole1)
    loser1.incrementTotalGameCount(playerCount)

    loser2.incrementRoleGameCount(losingRole2)
    if (this.normalize(loser1.name) !== this.normalize(loser2.name)) {
      loser2.incrementTotalGameCount(playerCount)
    }

    this.entries.sort((a, b) => b.avgRating() - a.avgRating())
  }
}
