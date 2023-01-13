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

type WotrLadder = Map<string, WotrLadderEntry>

const DEFAULT_COLOR = '#ffffff' // White
const TOURNAMENT_COLOR = '#c9daf8' // Blue
const LEAGUE_COLOR = '#f9b1ff' // Purple

const SCORE_BUCKETS = [10, 33, 56, 79, 102, 126, 151, 178, 207, 236, 270, 308, 352, 409, 499, Number.MAX_SAFE_INTEGER]
const WINNER_HIGHER = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const WINNER_LOWER = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]

class WotrGameReport {
  row: any[]
  winner: string
  loser: string
  victory: Victory
  competitive: Competitive

  constructor (row: any[]) {
    // TODO This happily assumes that the types are correct on the parsed data -- bad idea
    this.row = row
    this.winner = row[2] as string
    this.loser = row[3] as string
    this.victory = row[5] as Victory
    this.competitive = row[6] as Competitive
  }

  annotate

  isLadderGame (): boolean {
    return this.competitive.startsWith('Ladder')
  }

  winningSide (): Side {
    return this.victory.includes('Shadow') || this.victory.includes('SP') ? 'Shadow' : 'Free'
  }

  losingSide (): Side {
    return this.winningSide() === 'Shadow' ? 'Free' : 'Shadow'
  }

  process (ladder: WotrLadder): void {
    const winner = ladder.get(this.winner)
    const loser = ladder.get(this.loser)

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

    winner.setRating(winningSide, winnerRating + scoreAdjustment)
    loser.setRating(losingSide, loserRating - scoreAdjustment)
  }
}

class WotrLadderEntry {
  name: string
  shadowRating: number
  freeRating: number
  gamesPlayed: number

  constructor (row: any[]) {
    // TODO This happily assumes that the types are correct on the parsed data -- bad idea
    this.name = row[0] as string
    this.shadowRating = row[2] as number
    this.freeRating = row[3] as number
    this.gamesPlayed = row[4] as number
  }

  mapEntry (): [string, WotrLadderEntry] {
    return [this.name, this]
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
}

function getSheet (name: string): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name)
  if (sheet === null) {
    throw new Error(`Could not find a sheet named "${name}". Are you sure it exists?`)
  }
  return sheet
}

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

function update (): void {
  // Define the sheets we will read
  const updateSheet = getSheet('Update')
  const responseSheet = getSheet('wotr form response')
  const reportSheet = getSheet('WotR Reports')
  const wotrLadderSheet = getSheet('WOTR ladder')

  // Google's API is quite slow, so we want to read all the data we need into memory before manipulating and writing
  // it back. For the ladder update, we need all outstanding game form responses, and the ladder itself.

  // The report page is simple, a header followed by data rows, with each row representing a game.
  const reportHeaderLines = 1
  const reportValues = responseSheet.getDataRange().offset(reportHeaderLines, 0).getValues()

  // The ladder has a header and footer, as well as extraneous information (such as rank and flag) that we don't need
  // or want to read. Start with the name of the player in first place, then grab the data rows only.
  const ladderHeaderLines = 3
  const ladderFooterLines = 2
  const ladderDataRows = wotrLadderSheet.getLastRow() - ladderHeaderLines - ladderFooterLines
  const wotrLadderValues = wotrLadderSheet.getRange(4, 3, ladderDataRows, 5).getValues()

  // Map the data into some nice data structures, for name-based field querying and efficient lookup of ladder players
  const wotrLadder = new Map(wotrLadderValues.map((row) => new WotrLadderEntry(row).mapEntry()))
  const reports = reportValues.map((row) => new WotrGameReport(row))

  const newPlayers = new Set(
    reports
      .map((report) => [report.winner, report.loser])
      .flat()
      .filter((player) => !wotrLadder.has(player))
  )

  newPlayers.forEach((player) => {
    wotrLadder.set(player, new WotrLadderEntry([player, 500, 500, 500, 0]))
  })

  reports
    .filter((report) => report.isLadderGame())
    .forEach((report) => {
      report.process(wotrLadder)
    })
}
