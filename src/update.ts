/** Main entry-point for update. */
import { queryBatchSize } from './lib'
import { WotrReport, WotrLadder, WotrLadderEntry } from './objects'
import { FormResponseSheet, LadderSheet, ReportSheet, ReportSheetWithoutStats } from './sheets'

/** Process reports and update ladder for War of the Ring board game. */
export function updateWotrLadder (): void {
  // Build sheets
  const responseSheet = new FormResponseSheet(queryBatchSize())
  const ladderSheet = new LadderSheet()
  const reportSheet = new ReportSheet()
  const reportSheetWithoutStats = new ReportSheetWithoutStats()

  // Read sheet data and structure the ladder
  const reports = responseSheet.readResponses().map((row) => new WotrReport(row))
  const ladderEntries = ladderSheet.readLadder().map((row) => new WotrLadderEntry(row))
  const ladder = new WotrLadder(ladderEntries)

  // Process all the ladder games in the batch
  reports
    .filter((report) => report.isLadderGame())
    .forEach((report) => {
      ladder.processReport(report)
    })

  // Update the report sheets with new reports
  reportSheet.updateReports(reports.filter((report) => report.hasStats()))
  reportSheetWithoutStats.updateReports(reports.filter((report) => !report.hasStats()))

  // Update the ladder with new ratings and new players (if any)
  const originalPlayerCount = ladderEntries.length
  const newPlayerCount = ladder.entries.length - originalPlayerCount
  ladderSheet.prepareNewPlayerRows(originalPlayerCount, newPlayerCount)
  ladderSheet.writeLadderEntries(ladder)

  // Delete process form responses
  responseSheet.deleteResponses()
}
