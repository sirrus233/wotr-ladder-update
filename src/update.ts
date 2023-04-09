import { queryBatchSize } from './lib'
import { WotrReport, WotrLadder, WotrLadderEntry } from './objects'
import { FormResponseSheet, LadderSheet, ReportSheet, ReportSheetWithoutStats } from './sheets'

export function updateWotrLadder (): void {
  const responseSheet = new FormResponseSheet(queryBatchSize())
  const ladderSheet = new LadderSheet()
  const reportSheet = new ReportSheet()
  const reportSheetWithoutStats = new ReportSheetWithoutStats()

  const reports = responseSheet.readResponses().map((row) => new WotrReport(row))
  const ladderEntries = ladderSheet.readLadder().map((row) => new WotrLadderEntry(row))
  const ladder = new WotrLadder(ladderEntries)

  reports
    .filter((report) => report.isLadderGame())
    .forEach((report) => {
      ladder.processReport(report)
    })

  reportSheet.updateReports(reports.filter((report) => report.hasStats()))
  reportSheetWithoutStats.updateReports(reports.filter((report) => !report.hasStats()))

  responseSheet.deleteResponses()

  const originalPlayerCount = ladderEntries.length
  const newPlayerCount = ladder.entries.length - originalPlayerCount
  ladderSheet.prepareNewPlayerRows(originalPlayerCount, newPlayerCount)
  ladderSheet.writeLadderEntries(ladder)
}
