import { AnnotatedReport, WotrGameReport, WotrLadder, WotrLadderEntry } from './objects'

const BATCH_SIZE_DEFAULT = 5
const RESPONSE_WIDTH = 47

function getSheet (name: string): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name)
  if (sheet === null) {
    throw new Error(`Could not find a sheet named "${name}". Are you sure it exists?`)
  }
  return sheet
}

function updateReports (
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  reports: AnnotatedReport[],
  headers: number,
  leftPad: number
): void {
  const adminFormulas = sheet.getRange(headers + 1, 1, 1, sheet.getMaxColumns()).getFormulasR1C1()

  sheet.insertRowsBefore(headers + 1, reports.length)

  const newReportsFullRange = sheet.getRange(headers + 1, 1, reports.length, sheet.getMaxColumns())
  const formulas = Array(reports.length).fill(adminFormulas[0])
  newReportsFullRange.setValues(formulas)

  const newReportsRange = sheet.getRange(headers + 1, leftPad + 1, reports.length, RESPONSE_WIDTH)
  newReportsRange.setValues(reports.map((report) => report.report.row))

  const annotationsRange = sheet.getRange(headers + 1, sheet.getMaxColumns() - 4 + 1, reports.length, 4)
  annotationsRange.setValues(reports.map((report) => report.annotation))

  sheet.sort(leftPad + 1, false)
}

function update (): void {
  // Define the sheets we will read
  const responseSheet = getSheet('wotr form response')
  const reportSheet = getSheet('WotR Reports')
  const reportSheetWithoutStats = getSheet('Ladder Games with no stats')
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
  const responseRange = responseSheet.getRange(2, 1, batchSize, RESPONSE_WIDTH)
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

  const annotatedReports = reports.map((report, i) => new AnnotatedReport(report, annotations[i]))
  const reportsWithStats = annotatedReports.filter((report) => report.report.hasStats())
  const reportsWithoutStats = annotatedReports.filter((report) => !report.report.hasStats())

  if (reportsWithStats.length > 0) {
    updateReports(reportSheet, reportsWithStats, 2, 2)
  }

  if (reportsWithoutStats.length > 0) {
    updateReports(reportSheetWithoutStats, reportsWithoutStats, 1, 1)
  }

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
