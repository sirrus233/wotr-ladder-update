/**
 * This module defines objects that represent entire single pages (sheets) of the spreadsheet.
 * Each model defines the operations (cell reads/writes) that must be performed on that sheet to do a ladder update.
 */
import { WotrReport, WotrLadder } from './objects'
import { LADDER_ROW_LENGTH, LadderRow, REPORT_ROW_LENGTH, ReportRow, parseLadderRow, parseReportRow } from './types'

// A sheet is accessed by its string name. Important sheets are catalogued here.
const FORM_RESPONSES_SHEET = 'wotr form response'
const GAME_REPORTS_SHEET = 'WotR Reports'
const GAME_REPORTS_WITHOUT_STATS_SHEET = 'Ladder Games with no stats'
const LADDER_SHEET = 'WOTR ladder'

/**
 * Base class for all Sheets.
 */
abstract class Sheet {
  /** The name of the sheet. Every Sheet subclass should explicitly override this. */
  protected abstract readonly _sheetName: string
  /** The Google Sheet object. DO NOT ACCESS DIRECTLY. Use the getter, which guarantees this will be defined. */
  private _sheet!: GoogleAppsScript.Spreadsheet.Sheet

  /**
   * Internal getter for this object's sheet data. Google's API is expensive to call, so the sheet should be
   * lazily initialized by this method. This is protected, as it is only intended to be used by subclasses to perform
   * the public sheet operations.
   */
  protected get sheet (): GoogleAppsScript.Spreadsheet.Sheet {
    if (this._sheet == null) {
      const sheet = SpreadsheetApp.getActive().getSheetByName(this._sheetName)
      if (sheet === null) {
        throw new Error(`Could not find a sheet named "${this._sheetName}". Are you sure it exists?`)
      }
      this._sheet = sheet
    }

    return this._sheet
  }
}

/** */
export class FormResponseSheet extends Sheet {
  protected readonly _sheetName = LADDER_SHEET
  private readonly HEADERS = 1
  /**
   * Form responses are processed in batches, primarily due to legacy behavior where it took a very long time
   * to process large numbers of reports. Batch processing is supported here, and the size of the batch must be
   * specified when this object is created.
   */
  private _batchSize: number

  constructor (batchSize: number) {
    super()
    this._batchSize = batchSize
  }

  readResponses (): ReportRow[] {
    // The report page is simple, a header followed by data rows, with each row representing a game.
    const numReports = this.sheet.getLastRow() - this.HEADERS

    // Modify the batch size if it is too big
    if (numReports < this._batchSize) {
      this._batchSize = numReports
    }

    const responseRange = this.sheet.getRange(this.HEADERS + 1, 1, this._batchSize, REPORT_ROW_LENGTH)
    return responseRange.getValues().map(parseReportRow)
  }

  deleteResponses (): void {
    this.sheet.deleteRows(this.HEADERS + 1, this._batchSize)
  }
}

export class LadderSheet extends Sheet {
  protected readonly _sheetName = FORM_RESPONSES_SHEET
  private readonly HEADERS = 3
  private readonly FLAG_COL = 2
  private readonly NAME_COL = 3
  private readonly RATING_COL = 5
  private readonly NUM_RATING_COLS = 3
  private readonly ACTIVE_RATING_COL = 30

  readLadder (): LadderRow[] {
    const ladderRange = this.sheet.getRange(this.HEADERS + 1, 1, this.sheet.getLastRow(), LADDER_ROW_LENGTH)
    const ladderValues = ladderRange.getValues()
    const numPlayers = ladderValues.findIndex((row) => row[0] === '')
    return ladderValues.slice(0, numPlayers).map(parseLadderRow)
  }

  prepareNewPlayerRows (originalPlayers: number, newPlayers: number): void {
    if (newPlayers === 0) {
      return
    }

    this.sheet.insertRowsAfter(this.HEADERS + originalPlayers, newPlayers)
    const entryWidth = this.sheet.getLastColumn()
    const lastEntryRange = this.sheet.getRange(this.HEADERS + originalPlayers, 1, 1, entryWidth)
    const newPlayerEntriesRange = this.sheet.getRange(this.HEADERS + newPlayers + 1, 1, newPlayers, entryWidth)
    lastEntryRange.copyTo(newPlayerEntriesRange, { contentsOnly: false })

    const newPlayerFlagRange = this.sheet.getRange(this.HEADERS + originalPlayers + 1, this.FLAG_COL, newPlayers, 1)
    newPlayerFlagRange.clearContent()
  }

  writeLadderEntries (ladder: WotrLadder): void {
    const entryCount = ladder.originalEntries.length
    const nameRange = this.sheet.getRange(this.HEADERS + 1, this.NAME_COL, entryCount, 1)
    const ratingsRange = this.sheet.getRange(this.HEADERS + 1, this.RATING_COL, entryCount, this.NUM_RATING_COLS)

    nameRange.setValues(ladder.originalEntries.map((entry) => [entry.name]))
    ratingsRange.setValues(
      ladder.originalEntries.map((entry) => [entry.shadowRating, entry.freeRating, entry.gamesPlayed])
    )

    const entryWidth = this.sheet.getLastColumn()
    const entryWidthWithoutRank = entryWidth - 1
    const sortRange = this.sheet.getRange(this.HEADERS + 1, this.FLAG_COL, entryCount, entryWidthWithoutRank)
    sortRange.sort({ column: this.ACTIVE_RATING_COL, ascending: false })
  }
}

export class ReportSheet extends Sheet {
  protected readonly _sheetName = GAME_REPORTS_SHEET
  private readonly HEADERS = 1
  private readonly DATA_START_COL = 3

  updateReports (reports: WotrReport[]): void {
    if (reports.length === 0) {
      return
    }

    const sheetWidth = this.sheet.getMaxColumns()
    const reportWidth = reports[0].row.length
    const annotationWidth = reports[0].annotation.length

    const adminFormulas = this.sheet.getRange(this.HEADERS + 1, 1, 1, sheetWidth).getFormulasR1C1()
    const adminFormulaRow = adminFormulas[0]

    this.sheet.insertRowsBefore(this.HEADERS + 1, reports.length)

    const newReportsFullRange = this.sheet.getRange(this.HEADERS + 1, 1, reports.length, sheetWidth)
    const formulas = Array(reports.length).fill(adminFormulaRow) as Array<Array<string | null>>
    newReportsFullRange.setValues(formulas)

    const newReportsDataRange = this.sheet.getRange(this.HEADERS + 1, this.DATA_START_COL, reports.length, reportWidth)
    newReportsDataRange.setValues(reports.map((report) => report.row))

    const annotationsRange = this.sheet.getRange(
      this.HEADERS + 1,
      sheetWidth - annotationWidth + 1,
      reports.length,
      annotationWidth
    )
    annotationsRange.setValues(reports.map((report) => report.annotation))

    this.sheet.sort(this.DATA_START_COL, false)
  }
}

export class ReportSheetWithoutStats extends Sheet {
  protected readonly _sheetName = GAME_REPORTS_WITHOUT_STATS_SHEET
  private readonly HEADERS = 1
  private readonly DATA_START_COL = 2

  updateReports (reports: WotrReport[]): void {
    if (reports.length === 0) {
      return
    }

    const reportWidth = reports[0].row.length

    this.sheet.insertRowsBefore(this.HEADERS + 1, reports.length)
    const newReportsDataRange = this.sheet.getRange(this.HEADERS + 1, this.DATA_START_COL, reports.length, reportWidth)
    newReportsDataRange.setValues(reports.map((report) => report.row))

    this.sheet.sort(this.DATA_START_COL, false)
  }
}
