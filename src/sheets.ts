/**
 * Classes that represent an abstraction of a single Sheet of the Spreadsheet.
 * Each model defines the operations (cell reads/writes) that must be performed on that sheet to do a ladder update.
 * It should be noted that, as a general rule calls to the Google API are expensive, and each one adds significant
 * runtime to the update script.
 */

import { WotrReport, WotrLadder, CardLadder, CardReport } from './objects'
import {
  CARD_LADDER_ROW_LENGTH,
  CARD_REPORT_ROW_LENGTH,
  CardLadderRow,
  CardReportRow,
  parseCardLadderRow,
  parseCardReportRow
} from './types/cardGameTypes'
import {
  WOTR_LADDER_ROW_LENGTH,
  WotrLadderRow,
  WOTR_REPORT_ROW_LENGTH,
  WotrReportRow,
  parseWotrLadderRow,
  parseWotrReportRow
} from './types/wotrTypes'

// A sheet is accessed by its string name. Important sheets are catalogued here.
const UPDATE_SHEET = 'Update'
const WOTR_FORM_RESPONSES_SHEET = 'wotr form response'
const CARD_FORM_RESPONSES_SHEET = 'Card game responses'
const GAME_REPORTS_SHEET = 'WotR Reports'
const CARD_REPORTS_SHEET = 'Card Game Reports'
const GAME_REPORTS_WITHOUT_STATS_SHEET = 'Ladder Games with no stats'
const WOTR_LADDER_SHEET = 'WOTR ladder'
const CARD_LADDER_SHEET = 'Card Game 2023 ladder'

/**
 * Base class for all Sheets.
 */
abstract class Sheet {
  /** The name of the sheet. Every Sheet subclass should explicitly override this. */
  protected abstract readonly _sheetName: string
  /** The Google Sheet object. DO NOT ACCESS DIRECTLY. Use the getter, which guarantees this will be defined. */
  private _sheet!: GoogleAppsScript.Spreadsheet.Sheet

  /**
   * Internal getter for this object's sheet data. Google's API is expensive to call, so the Sheet should be
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

/** Admin settings page for the ladder update */
export class UpdateSheet extends Sheet {
  protected readonly _sheetName = UPDATE_SHEET
  private readonly defaultBatchSize = 25

  /** Get how many reports should be processed in a single batch. */
  getBatchSize (): number {
    const batchSizeValue = this.sheet.getRange('C21').getValue() as string | number
    if (batchSizeValue === '') {
      return this.defaultBatchSize
    } else if (typeof batchSizeValue === 'number') {
      return batchSizeValue
    } else {
      throw new Error(`Unknown batch size: ${batchSizeValue}. Check cell C21 on the UPDATE sheet.`)
    }
  }
}

/** Has the output of the form players use to report their games. This is where games live before they are processed. */
abstract class FormResponseSheet<T> extends Sheet {
  protected abstract readonly _sheetName: string
  protected abstract readonly _parser: (val: unknown) => T
  protected abstract readonly HEADERS: number
  protected abstract readonly ROW_LENGTH: number
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

  /**
   * Read a batch of responses from the sheet. NOTE: If there are fewer responses than the object's batchSize, then the
   * batchSize is automatically adjusted down to match the total number of responses.
   */
  readResponses (): T[] {
    if (this._batchSize === 0) {
      return []
    }

    // The sheet is simple, a header followed by data rows, with each row representing a game.
    const numReports = this.sheet.getLastRow() - this.HEADERS

    if (numReports === 0) {
      return []
    }

    // Modify the batch size if it is too big
    if (numReports < this._batchSize) {
      this._batchSize = numReports
    }
    const responseRange = this.sheet.getRange(this.HEADERS + 1, 1, this._batchSize, this.ROW_LENGTH)
    return responseRange.getValues().map(this._parser)
  }

  /** Delete a batch of responses. */
  deleteResponses (): void {
    if (this._batchSize === 0) {
      return
    }

    this.sheet.deleteRows(this.HEADERS + 1, this._batchSize)
  }
}

export class WotrFormResponseSheet extends FormResponseSheet<WotrReportRow> {
  protected readonly _sheetName = WOTR_FORM_RESPONSES_SHEET
  protected readonly _parser = parseWotrReportRow
  protected readonly HEADERS = 1
  protected readonly ROW_LENGTH = WOTR_REPORT_ROW_LENGTH
}

export class CardGameFormResponseSheet extends FormResponseSheet<CardReportRow> {
  protected readonly _sheetName = CARD_FORM_RESPONSES_SHEET
  protected readonly _parser = parseCardReportRow
  protected readonly HEADERS = 1
  protected readonly ROW_LENGTH = CARD_REPORT_ROW_LENGTH
}

/** The ladder that tracks players and their ranks and ratings. */
export class WotrLadderSheet extends Sheet {
  protected readonly _sheetName = WOTR_LADDER_SHEET
  private readonly HEADERS = 3
  // Some columns have important semantics
  private readonly FLAG_COL = 2 // Player's national flag
  private readonly NAME_COL = 3 // Player's name
  private readonly RATING_COL = 5 // First (left-most) column containing a player rating
  private readonly NUM_RATING_COLS = 3 // Number of columns with rating information
  private readonly ACTIVE_RATING_COL = 30 // "Active rating", a modified rating used for sorting

  /** Read all player entries from the ladder */
  readLadder (): WotrLadderRow[] {
    // Most of the ladder is managed by sheet formulas automatically, so we don't need to grab entire rows.
    // It is sufficient to grab name + rating information
    const ladderRange = this.sheet.getRange(this.HEADERS + 1, 1, this.sheet.getLastRow(), WOTR_LADDER_ROW_LENGTH)
    const ladderValues = ladderRange.getValues()
    // The sheet has a footer that will get picked up when parsing. We need to find and drop any trailing rows that do
    // not represent players.
    const numPlayers = ladderValues.findIndex((row) => row[0] === '')
    return ladderValues.slice(0, numPlayers).map(parseWotrLadderRow)
  }

  /**
   * Add space in the ladder for new players, retaining the standard ladder formatting. This function must be told
   * how many players there originally were (to avoid re-querying), and how many players are being added.
   */
  prepareNewPlayerRows (originalPlayers: number, newPlayers: number): void {
    if (newPlayers === 0) {
      return
    }

    // Insert new rows at the bottom of the ladder, below the last player and above the footer.
    // A row insert like this preserves the formatting of the prior row.
    this.sheet.insertRowsAfter(this.HEADERS + originalPlayers, newPlayers)
    // We now copy the formulas from the last player in the ladder into the rows of each new player we just created.
    const sheetWidth = this.sheet.getMaxColumns()
    const lastEntryRange = this.sheet.getRange(this.HEADERS + originalPlayers, 1, 1, sheetWidth)
    const newPlayerEntriesRange = this.sheet.getRange(this.HEADERS + originalPlayers + 1, 1, newPlayers, sheetWidth)
    lastEntryRange.copyTo(newPlayerEntriesRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false)
  }

  /** Write data back to the ladder, overwriting its current state. */
  writeLadderEntries (ladder: WotrLadder): void {
    // We need to be careful to only overwrite the data this script is supposed to manage, and leave any sheet formulae
    // alone. This means computing ranges for player names, and their rating information.
    const entryCount = ladder.originalEntries.length
    const nameRange = this.sheet.getRange(this.HEADERS + 1, this.NAME_COL, entryCount, 1)
    const ratingsRange = this.sheet.getRange(this.HEADERS + 1, this.RATING_COL, entryCount, this.NUM_RATING_COLS)
    // Write data in the same order it was read, with new players at the end.
    nameRange.setValues(ladder.originalEntries.map((entry) => [entry.name]))
    ratingsRange.setValues(
      ladder.originalEntries.map((entry) => [entry.shadowRating, entry.freeRating, entry.gamesPlayed])
    )
    // Finally, we sort the ladder. We need to sort entire rows, but only the player entry ones (not the header or
    // footer), and only from the right of the "Rank" column (which is the left-most) since it is generated by formula.
    // That's why we have this kind of funky-looking range here.
    SpreadsheetApp.flush() // We need to kick the sheet here, so the sort can see the updated values.
    const sheetWidth = this.sheet.getMaxColumns()
    const sheetWidthWithoutRank = sheetWidth - 1
    const sortRange = this.sheet.getRange(this.HEADERS + 1, this.FLAG_COL, entryCount, sheetWidthWithoutRank)
    sortRange.sort({ column: this.ACTIVE_RATING_COL, ascending: false })
  }
}

/** The ladder that tracks players and their ranks and ratings. */
export class CardLadderSheet extends Sheet {
  protected readonly _sheetName = CARD_LADDER_SHEET
  private readonly HEADERS = 3
  // Some columns have important semantics
  private readonly FLAG_COL = 2 // Player's national flag
  private readonly NAME_COL = 3 // Player's name
  private readonly RATING_COL = 5 // Player's average rating
  private readonly DATA_COL = 5 // First (left-most) column containing data managed by this script
  /* Number of columns with data managed by this script */
  private readonly NUM_DATA_COLS = CARD_LADDER_ROW_LENGTH - this.DATA_COL + 1

  /** Read all player entries from the ladder */
  readLadder (): CardLadderRow[] {
    const ladderRange = this.sheet.getRange(this.HEADERS + 1, 1, this.sheet.getLastRow(), CARD_LADDER_ROW_LENGTH)
    const ladderValues = ladderRange.getValues()
    // The sheet has a footer that will get picked up when parsing. We need to find and drop any trailing rows that do
    // not represent players.
    const numPlayers = ladderValues.findIndex((row) => row[0] === '')
    return ladderValues.slice(0, numPlayers).map(parseCardLadderRow)
  }

  /**
   * Add space in the ladder for new players, retaining the standard ladder formatting. This function must be told
   * how many players there originally were (to avoid re-querying), and how many players are being added.
   */
  prepareNewPlayerRows (originalPlayers: number, newPlayers: number): void {
    if (newPlayers === 0) {
      return
    }

    // Insert new rows at the bottom of the ladder, below the last player and above the footer.
    // A row insert like this preserves the formatting of the prior row.
    this.sheet.insertRowsAfter(this.HEADERS + originalPlayers, newPlayers)
    // We now copy the formulas from the last player in the ladder into the rows of each new player we just created.
    const sheetWidth = this.sheet.getMaxColumns()
    const lastEntryRange = this.sheet.getRange(this.HEADERS + originalPlayers, 1, 1, sheetWidth)
    const newPlayerEntriesRange = this.sheet.getRange(this.HEADERS + originalPlayers + 1, 1, newPlayers, sheetWidth)
    lastEntryRange.copyTo(newPlayerEntriesRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false)
  }

  /** Write data back to the ladder, overwriting its current state. */
  writeLadderEntries (ladder: CardLadder): void {
    // We need to be careful to only overwrite the data this script is supposed to manage, and leave any sheet formulae
    // alone. This means computing ranges for player names, and their rating information.
    const entryCount = ladder.originalEntries.length
    const nameRange = this.sheet.getRange(this.HEADERS + 1, this.NAME_COL, entryCount, 1)
    const ratingsRange = this.sheet.getRange(this.HEADERS + 1, this.DATA_COL, entryCount, this.NUM_DATA_COLS)
    // Write data in the same order it was read, with new players at the end.
    // We need to manually compute average scores for the FP and SP sides
    nameRange.setValues(ladder.originalEntries.map((entry) => [entry.name]))
    ratingsRange.setValues(
      ladder.originalEntries
        .map((entry) => entry.row)
        .map((row) => {
          row.splice(8, 1, [(row[6] + row[7]) / 2])
          return row
        })
        .map((row) => {
          row.splice(9, 1, [(row[4] + row[5]) / 2])
          return row
        })
        .map((row) => row.slice(this.DATA_COL - 1))
    )
    // Finally, we sort the ladder. We need to sort entire rows, but only the player entry ones (not the header or
    // footer), and only from the right of the "Rank" column (which is the left-most) since it is generated by formula.
    // That's why we have this kind of funky-looking range here.
    SpreadsheetApp.flush() // We need to kick the sheet here, so the sort can see the updated values.
    const sheetWidth = this.sheet.getMaxColumns()
    const sheetWidthWithoutRank = sheetWidth - 1
    const sortRange = this.sheet.getRange(this.HEADERS + 1, this.FLAG_COL, entryCount, sheetWidthWithoutRank)
    sortRange.sort({ column: this.RATING_COL, ascending: false })
  }
}

/** Game reports and their statistics that have been processed. */
export class WotrReportSheet extends Sheet {
  protected readonly _sheetName = GAME_REPORTS_SHEET
  private readonly HEADERS = 1
  /**
   * The sheet has some columns on the left-hand side that are auto-calculated and should be left alone. This marks
   * the first column where reports start.
   */
  private readonly DATA_START_COL = 3

  /** Update with new reports, appended to the top of the sheet. */
  updateReports (reports: WotrReport[]): void {
    if (reports.length === 0) {
      return
    }

    const sheetWidth = this.sheet.getMaxColumns()
    const reportWidth = reports[0].row.length
    const annotationWidth = reports[0].annotation.length
    const annotationStartCol = sheetWidth - annotationWidth + 1 // Account for future admin columns before annotations
    // Add a new row for each report.
    this.sheet.insertRowsBefore(this.HEADERS + 1, reports.length)
    // Copy the formulas from the latest report (pre-update) to each new row.
    const latestReport = this.sheet.getRange(this.HEADERS + reports.length + 1, 1, 1, sheetWidth)
    const newReportsRange = this.sheet.getRange(this.HEADERS + 1, 1, reports.length, sheetWidth)
    latestReport.copyTo(newReportsRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false)
    // Now we need to write the data and annotations into the sheet, overwriting the values we copied. Formula cells
    // should stay untouched, retaining their values.
    // Copy all report data.
    this.sheet
      .getRange(this.HEADERS + 1, this.DATA_START_COL, reports.length, reportWidth)
      .setValues(reports.map((report) => report.row))
    // Copy annotations.
    this.sheet
      .getRange(this.HEADERS + 1, annotationStartCol, reports.length, annotationWidth)
      .setValues(reports.map((report) => report.annotation))
    // Sort the sheet by the first data column, which should be Timestamp. Most recent reports should be at the top.
    this.sheet.sort(this.DATA_START_COL, false)
  }
}

/** Processed game reports where the players could not remember the game stats. */
export class WotrReportSheetWithoutStats extends Sheet {
  protected readonly _sheetName = GAME_REPORTS_WITHOUT_STATS_SHEET
  private readonly HEADERS = 1
  private readonly DATA_START_COL = 2

  /** Update with new reports, appended to the top of the sheet. */
  updateReports (reports: WotrReport[]): void {
    if (reports.length === 0) {
      return
    }

    // Updating a report without stats is similar to updating one with stats, but there are no annotations or formulas
    // to deal with.
    const reportWidth = reports[0].row.length
    this.sheet.insertRowsBefore(this.HEADERS + 1, reports.length)
    const newReportsDataRange = this.sheet.getRange(this.HEADERS + 1, this.DATA_START_COL, reports.length, reportWidth)
    newReportsDataRange.setValues(reports.map((report) => report.row))
    this.sheet.sort(this.DATA_START_COL, false)
  }
}

/** Game reports and their statistics that have been processed. */
export class CardReportSheet extends Sheet {
  protected readonly _sheetName = CARD_REPORTS_SHEET
  private readonly HEADERS = 1

  /** Update with new reports, appended to the top of the sheet. */
  updateReports (reports: CardReport[]): void {
    if (reports.length === 0) {
      return
    }

    const reportWidth = reports[0].row.length
    // Add a new row for each report.
    this.sheet.insertRowsBefore(this.HEADERS + 1, reports.length)
    // Write reports into the sheet
    this.sheet.getRange(this.HEADERS + 1, 1, reports.length, reportWidth).setValues(reports.map((report) => report.row))
    // Sort the sheet by the first data column, which should be Timestamp. Most recent reports should be at the top.
    // We need to make sure to ignore the header.
    this.sheet.getDataRange().offset(1, 0).sort({ column: 1, ascending: false })
  }
}
