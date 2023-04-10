/** Main entry-point for update. */
import { WotrReport, WotrLadder, WotrLadderEntry } from './objects'
import { FormResponseSheet, LadderSheet, ReportSheet, ReportSheetWithoutStats, UpdateSheet } from './sheets'

/** Process reports and update ladder for War of the Ring board game. */
export function updateWotrLadder (): void {
  // Build sheets
  const updateSheet = new UpdateSheet()
  const responseSheet = new FormResponseSheet(updateSheet.getBatchSize())
  const ladderSheet = new LadderSheet()
  const reportSheet = new ReportSheet()
  const reportSheetWithoutStats = new ReportSheetWithoutStats()

  // Read sheet data and build the ladder
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

  // Delete processed form responses
  responseSheet.deleteResponses()
}
