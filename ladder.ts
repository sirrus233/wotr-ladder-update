import { WotrGameReport, WotrLadder, WotrLadderEntry } from './objects'

const BATCH_SIZE_DEFAULT = 5

function getSheet (name: string): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name)
  if (sheet === null) {
    throw new Error(`Could not find a sheet named "${name}". Are you sure it exists?`)
  }
  return sheet
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

  const adminFormulas = reportSheet.getRange(3, 1, 1, reportSheet.getMaxColumns()).getFormulasR1C1()

  reportSheet.insertRowsBefore(3, reports.length)

  const newReportsFullRange = reportSheet.getRange(3, 1, reports.length, reportSheet.getMaxColumns())
  const formulas = Array(reports.length).fill(adminFormulas[0])
  newReportsFullRange.setValues(formulas)

  const newReportsRange = reportSheet.getRange(3, 3, reports.length, responseWidth)
  newReportsRange.setValues(responseValues)

  const annotationsRange = reportSheet.getRange(3, reportSheet.getMaxColumns() - 4 + 1, reports.length, 4)
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
