/**
 * Type library for deserialization of data read from the spreadsheet.
 *
 * Google's APIs return untyped data. Getting cell values is generally type any[][], representing an array of rows
 * where each row is an array of anything. Since the data in the sheet is structured in a known format, these parsers,
 * types, and guards let us deal with the data in a strongly typed way.
 */

/** A function which maps an unknown value to a concretely typed one. */
type Parser<T> = (val: unknown) => T | null

/** Factory function to create a Parser for a type union of literals, given an array of the union's variants.  */
function unionParser<T> (variants: readonly T[]): Parser<T> {
  return (val: unknown) => (variants.includes(val as T) ? (val as T) : null)
}

/** A function which takes a parser and returns a new function that is a safe type guard for T. */
const createTypeGuard =
  <T>(parse: Parser<T>) =>
    (value: unknown): value is T => {
      return parse(value) !== null
    }

const EXPANSION = ['Base', 'LoME', 'WoME', 'LoME+WoME'] as const
const isExpansion = createTypeGuard(unionParser(EXPANSION))
export type Expansion = (typeof EXPANSION)[number]

const VICTORY = [
  'Free People Ring',
  'Free People Military',
  'Conceded FP won',
  'Shadow Forces Corruption',
  'Shadow Forces Military',
  'Conceded SP won'
] as const
const isVictory = createTypeGuard(unionParser(VICTORY))
export type Victory = (typeof VICTORY)[number]

const COMPETITIVE = [
  'Friendly',
  'Ladder',
  'Ladder and tournament',
  'Ladder and league (general)',
  'Ladder and league (lome)',
  'Ladder and league (TTS)',
  'Ladder and league (wome)',
  'Ladder but I cannot remember the stats'
] as const
const isCompetitive = createTypeGuard(unionParser(COMPETITIVE))
export type Competitive = (typeof COMPETITIVE)[number]

const TICK_BOX = [1, ''] as const
const isTickBox = createTypeGuard(unionParser(TICK_BOX))
export type TickBox = (typeof TICK_BOX)[number]

const YES_BOX = ['Yes', ''] as const
const isYesBox = createTypeGuard(unionParser(YES_BOX))
export type YesBox = (typeof YES_BOX)[number]

export const REPORT_ROW_LENGTH = 47
export type ReportRow = [
  timestamp: string,
  turns: number,
  winner: string,
  loser: string,
  expansion: Expansion,
  victory: Victory,
  competitive: Competitive,
  cities: YesBox,
  treebeard: YesBox,
  fateErebor: YesBox,
  actionTokens: string,
  dwarvenRings: string,
  corruption: number,
  mordor: TickBox,
  mordorTrack: number,
  aragorn: number,
  treebeard: TickBox,
  eyes: number,
  rivendell: TickBox,
  greyHavens: TickBox,
  shire: TickBox,
  helmsDeep: TickBox,
  edoras: TickBox,
  lorien: TickBox,
  woodlandRealm: TickBox,
  dale: TickBox,
  erebor: TickBox,
  minasTirith: TickBox,
  pelargir: TickBox,
  dolAmroth: TickBox,
  eredLuinCities: TickBox,
  rating: number | '',
  comments: string,
  gameLog: string,
  dolGuldur: TickBox,
  morannon: TickBox,
  orthanc: TickBox,
  mtGundabad: TickBox,
  angmar: TickBox,
  moria: TickBox,
  minasMorgul: TickBox,
  baradDur: TickBox,
  umbar: TickBox,
  farHarad: TickBox,
  southRhunCities: TickBox,
  ereborFate: TickBox,
  ironHillsFate: TickBox
]
export function parseReportRow (val: unknown): ReportRow {
  if (
    Array.isArray(val) &&
    val.length === REPORT_ROW_LENGTH &&
    typeof val[0] === 'string' &&
    typeof val[1] === 'number' &&
    typeof val[2] === 'string' &&
    typeof val[3] === 'string' &&
    isExpansion(val[4]) &&
    isVictory(val[5]) &&
    isCompetitive(val[6]) &&
    isYesBox(val[7]) &&
    isYesBox(val[8]) &&
    isYesBox(val[9]) &&
    typeof val[10] === 'string' &&
    typeof val[11] === 'string' &&
    typeof val[12] === 'number' &&
    isTickBox(val[13]) &&
    typeof val[14] === 'number' &&
    typeof val[15] === 'number' &&
    isTickBox(val[16]) &&
    typeof val[17] === 'number' &&
    isTickBox(val[18]) &&
    isTickBox(val[19]) &&
    isTickBox(val[20]) &&
    isTickBox(val[21]) &&
    isTickBox(val[22]) &&
    isTickBox(val[23]) &&
    isTickBox(val[24]) &&
    isTickBox(val[25]) &&
    isTickBox(val[26]) &&
    isTickBox(val[27]) &&
    isTickBox(val[28]) &&
    isTickBox(val[29]) &&
    isTickBox(val[30]) &&
    (typeof val[31] === 'number' || val[31] === '') &&
    typeof val[32] === 'string' &&
    typeof val[33] === 'string' &&
    isTickBox(val[34]) &&
    isTickBox(val[35]) &&
    isTickBox(val[36]) &&
    isTickBox(val[37]) &&
    isTickBox(val[38]) &&
    isTickBox(val[39]) &&
    isTickBox(val[40]) &&
    isTickBox(val[41]) &&
    isTickBox(val[42]) &&
    isTickBox(val[43]) &&
    isTickBox(val[44]) &&
    isTickBox(val[45]) &&
    isTickBox(val[46])
  ) {
    const report = val as ReportRow
    // Remove leading/trailing whitespace from reported winner/loser names
    report[2] = report[2].trim()
    report[3] = report[3].trim()
    return report
  }
  throw new Error('Failed to create a report row. Check the data in the row for errors.')
}

export const LADDER_ROW_LENGTH = 7
export type LadderRow = [
  rank: number,
  flag: string,
  name: string,
  rating: number,
  shadowRating: number,
  freeRating: number,
  gamesPlayed: number
]
export function parseLadderRow (val: unknown): LadderRow {
  if (
    Array.isArray(val) &&
    val.length === LADDER_ROW_LENGTH &&
    typeof val[0] === 'number' &&
    typeof val[1] === 'string' &&
    typeof val[2] === 'string' &&
    typeof val[3] === 'number' &&
    typeof val[4] === 'number' &&
    typeof val[5] === 'number' &&
    typeof val[6] === 'number'
  ) {
    const entry = val as LadderRow
    // Remove leading/trailing whitespace from player name
    entry[2] = entry[2].trim()
    return entry
  }
  throw new Error(`Failed to create a ladder row. Check the data in the row for errors.\n${val as string}`)
}

export type Side = 'Shadow' | 'Free'

export type Annotation = [
  winnerGamesPlayed: number,
  winnerRank: number,
  winnerRatingBefore: number,
  winnerRatingAfter: number,
  loserGamesPlayed: number,
  loserRank: number,
  loserRatingBefore: number,
  loserRatingAfter: number
]
