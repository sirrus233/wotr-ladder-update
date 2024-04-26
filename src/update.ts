/** Main entry-point for update. */
import { WotrReport, WotrLadder, WotrLadderEntry, CardReport, CardLadderEntry, CardLadder } from './objects'
import {
  WotrFormResponseSheet,
  WotrLadderSheet,
  WotrReportSheet,
  WotrReportSheetWithoutStats,
  UpdateSheet,
  CardGameFormResponseSheet,
  CardReportSheet,
  CardLadderSheet
} from './sheets'

/** Process reports and update ladder for War of the Ring board game. */
export function updateWotrLadder (): void {
  // Build sheets
  const updateSheet = new UpdateSheet()
  const responseSheet = new WotrFormResponseSheet(updateSheet.getBatchSize())
  const ladderSheet = new WotrLadderSheet()
  const reportSheet = new WotrReportSheet()
  const reportSheetWithoutStats = new WotrReportSheetWithoutStats()

  // Read sheet data and build the ladder
  const reports = responseSheet.readResponses().map((row) => new WotrReport(row))
  const ladderEntries = ladderSheet.readLadder().map((row) => new WotrLadderEntry(row))
  const originalPlayerCount = ladderEntries.length
  const ladder = new WotrLadder(ladderEntries)

  // Process all the ladder games in the batch
  console.log('Processing games...')
  reports
    .filter((report) => report.isLadderGame())
    .forEach((report) => {
      ladder.processReport(report)
    })

  // Update the report sheets with new reports
  console.log('Updating Game Reports...')
  reportSheet.updateReports(reports.filter((report) => report.hasStats()))
  reportSheetWithoutStats.updateReports(reports.filter((report) => !report.hasStats()))

  // Update the ladder with new ratings and new players (if any)
  console.log('Updating Ladder...')
  const newPlayerCount = ladder.originalEntries.length - originalPlayerCount
  ladderSheet.prepareNewPlayerRows(originalPlayerCount, newPlayerCount)
  ladderSheet.writeLadderEntries(ladder)

  // Delete processed form responses
  console.log('Removing Processed Form Responses...')
  responseSheet.deleteResponses()
}

/** Process reports and update ladder for War of the Ring card game. */
export function updateCardLadder (): void {
  const updateSheet = new UpdateSheet()
  const responseSheet = new CardGameFormResponseSheet(updateSheet.getBatchSize())
  const ladderSheet = new CardLadderSheet()
  const reportSheet = new CardReportSheet()

  // Read sheet data and build the ladder
  const reports = responseSheet.readResponses().map((row) => new CardReport(row))
  const ladderEntries = ladderSheet.readLadder().map((row) => new CardLadderEntry(row))
  const originalPlayerCount = ladderEntries.length
  const ladder = new CardLadder(ladderEntries)

  // Process all the ladder games in the batch
  console.log('Processing games...')
  reports
    .filter((report) => report.isLadderGame())
    .forEach((report) => {
      ladder.processReport(report)
    })

  // Update the report sheets with new reports
  console.log('Updating Game Reports...')
  reportSheet.updateReports(reports)

  // Update the ladder with new ratings and new players (if any)
  console.log('Updating Ladder...')
  const newPlayerCount = ladder.originalEntries.length - originalPlayerCount
  ladderSheet.prepareNewPlayerRows(originalPlayerCount, newPlayerCount)
  ladderSheet.writeLadderEntries(ladder)

  // Delete processed form responses
  console.log('Removing Processed Form Responses...')
  responseSheet.deleteResponses()
}
