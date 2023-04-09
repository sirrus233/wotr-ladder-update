import { WotrReport, WotrLadder, WotrLadderEntry } from './objects'
import { FormResponseSheet, LadderSheet, ReportSheet, ReportSheetWithoutStats } from './sheets'

const BATCH_SIZE_DEFAULT = 5

function queryBatchSize (): number {
  const response = prompt('Please enter a batch size.', BATCH_SIZE_DEFAULT.toString())
  if (response === null) {
    return BATCH_SIZE_DEFAULT
  }
  return parseInt(response)
}

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
