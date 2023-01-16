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

const BATCH_SIZE_DEFAULT = 5

const SCORE_BUCKETS = [10, 33, 56, 79, 102, 126, 151, 178, 207, 236, 270, 308, 352, 409, 499, Number.MAX_SAFE_INTEGER]
const WINNER_HIGHER = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const WINNER_LOWER = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]

class WotrGameReport {
  winner: string
  loser: string
  victory: Victory
  competitive: Competitive

  constructor (row: any[]) {
    // TODO This happily assumes that the types are correct on the parsed data -- bad idea
    this.winner = (row[2] as string).trim()
    this.loser = (row[3] as string).trim()
    this.victory = row[5] as Victory
    this.competitive = row[6] as Competitive
  }

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

class WotrLadderEntry {
  name: string
  normalizedName: string
  shadowRating: number
  freeRating: number
  gamesPlayed: number

  constructor (row: any[]) {
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

class WotrLadder {
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
  const responseSheet = getSheet('wotr form response')
  const reportSheet = getSheet('WotR Reports')
  const ladderSheet = getSheet('WOTR ladder')
  const updateSheet = getSheet('Update')

  // Google's API is quite slow, so we want to read all the data we need into memory before manipulating and writing
  // it back. For the ladder update, we need all outstanding game form responses, and the ladder itself.

  const batchSizeValue = updateSheet.getRange('C21').getValue() as string | number
  let batchSize
  if (batchSizeValue === '') {
    batchSize = BATCH_SIZE_DEFAULT
  } else if (typeof batchSizeValue === 'number') {
    batchSize = batchSizeValue
  } else {
    throw new Error(`Unknown batch size: ${batchSizeValue}. Check cell C21 on the UPDATE sheet.`)
  }

  // The report page is simple, a header followed by data rows, with each row representing a game.
  const responseWidth = 47
  const responseRange = responseSheet.getRange(2, 1, batchSize, responseWidth)
  const responseValues = responseRange.getValues()

  // The ladder has a header and footer, as well as extraneous information (such as rank and flag) that we don't need
  // or want to read. Start with the name of the player in first place, then grab the data rows only.
  const ladderRankRange = ladderSheet.getRange(4, 1, ladderSheet.getLastRow(), 1)
  const ladderRankValues = ladderRankRange.getValues()
  const numPlayers = ladderRankValues.flat().indexOf('')

  const ladderNameRange = ladderSheet.getRange(4, 3, numPlayers, 1)
  const ladderDataRange = ladderSheet.getRange(4, 5, numPlayers, 3)
  const ladderNameValues = ladderNameRange.getValues()
  const ladderDataValues = ladderDataRange.getValues()

  // Map the data into some nice data structures, for name-based field querying and efficient lookup of ladder players
  // TODO A little gross / hard to follow. Maybe flat() the name array
  const wotrLadder = new WotrLadder(
    ladderNameValues.map((name, i) => new WotrLadderEntry(name.concat(ladderDataValues[i])))
  )

  const reports = responseValues.map((row) => new WotrGameReport(row))

  const newPlayers = new Set(
    reports
      .filter((report) => report.isLadderGame())
      .flatMap((report) => [report.winner, report.loser])
      .filter((player) => !wotrLadder.has(player))
  )

  newPlayers.forEach((name) => {
    wotrLadder.addPlayer(name)
  })

  const annotations = reports.map((report) => {
    let annotation
    if (report.isLadderGame()) {
      annotation = [
        wotrLadder.getEntry(report.winner).gamesPlayed,
        wotrLadder.getRank(report.winner),
        wotrLadder.getEntry(report.loser).gamesPlayed,
        wotrLadder.getRank(report.loser)
      ]
      report.process(wotrLadder)
    } else {
      annotation = [0, 0, 0, 0]
    }
    return annotation
  })

  reportSheet.insertRowsBefore(3, reports.length)
  const newReportsRange = reportSheet.getRange(3, 3, reports.length, responseWidth)
  newReportsRange.setValues(responseValues)

  const annotationsRange = reportSheet.getRange(3, 63, reports.length, 4)
  annotationsRange.setValues(annotations)
  reportSheet.sort(3, false)

  responseSheet.deleteRows(2, batchSize)

  const numLadderInserts = wotrLadder.originalEntries.length
  if (newPlayers.size > 0) {
    ladderSheet.insertRowsAfter(3 + numPlayers, newPlayers.size)
    const lastLadderEntryRange = ladderSheet.getRange(3 + numPlayers, 1, 1, ladderSheet.getLastColumn())
    const newPlayerEntryRange = ladderSheet.getRange(
      3 + numPlayers + 1,
      1,
      newPlayers.size,
      ladderSheet.getLastColumn()
    )
    lastLadderEntryRange.copyTo(newPlayerEntryRange, { contentsOnly: false })
    const newPlayerFlagRange = ladderSheet.getRange(3 + numPlayers + 1, 2, newPlayers.size, 1)
    newPlayerFlagRange.clearContent()
  }
  const writeLadderNameRange = ladderSheet.getRange(4, 3, numLadderInserts, 1)
  const writeLadderDataRange = ladderSheet.getRange(4, 5, numLadderInserts, 3)
  writeLadderNameRange.setValues(wotrLadder.originalEntries.map((entry) => [entry.name]))
  writeLadderDataRange.setValues(
    wotrLadder.originalEntries.map((entry) => [entry.shadowRating, entry.freeRating, entry.gamesPlayed])
  )
  ladderSheet.getRange(4, 2, numLadderInserts, ladderSheet.getLastColumn()).sort([
    { column: 4, ascending: false },
    { column: 7, ascending: false }
  ])
}
