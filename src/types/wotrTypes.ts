/**
 * Type library for deserialization of data read from the spreadsheet.
 *
 * Google's APIs return untyped data. Getting cell values is generally type any[][], representing an array of rows
 * where each row is an array of anything. Since the data in the sheet is structured in a known format, these parsers,
 * types, and guards let us deal with the data in a strongly typed way.
 *
 * Types for the WotR Board Game
 */
import { unionParser, createTypeGuard } from './types'

const EXPANSION = ['Base', 'LoME', 'WoME', 'LoME+WoME', 'KoME', 'KoME+LoME', 'KoME+WoME', 'KoME+LoME+WoME'] as const
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
export type WotrVictory = (typeof VICTORY)[number]

const COMPETITIVE = [
  'Friendly',
  'Ladder',
  'Ladder and tournament',
  'Ladder and league (general)',
  'Ladder and league (lome)',
  'Ladder and league (TTS)',
  'Ladder and league (wome)',
  'Ladder and league (super)',
  'Ladder but I cannot remember the stats'
] as const
const isCompetitive = createTypeGuard(unionParser(COMPETITIVE))
export type WotrCompetitive = (typeof COMPETITIVE)[number]

const TICK_BOX = [1, ''] as const
const isTickBox = createTypeGuard(unionParser(TICK_BOX))
export type TickBox = (typeof TICK_BOX)[number]

const YES_BOX = ['Yes', ''] as const
const isYesBox = createTypeGuard(unionParser(YES_BOX))
export type YesBox = (typeof YES_BOX)[number]

export const WOTR_REPORT_ROW_LENGTH = 47
export type WotrReportRow = [
  timestamp: Date,
  turns: number,
  winner: string,
  loser: string,
  expansion: Expansion,
  victory: WotrVictory,
  competitive: WotrCompetitive,
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
export function parseWotrReportRow (val: unknown): WotrReportRow {
  const valStr = val as string
  if (!Array.isArray(val)) {
    throw new Error(`Error in game report. Value is not an array.\n${valStr}`)
  }
  if (val.length !== WOTR_REPORT_ROW_LENGTH) {
    throw new Error(`Error in game report. Expected ${WOTR_REPORT_ROW_LENGTH} entries. Got ${val.length}.\n${valStr}`)
  }
  if (Object.prototype.toString.call(val[0]) !== '[object Date]') {
    throw new Error(`Error in game report at field [0]. Expected 'Date'. Got ${typeof val[0]}.\n${valStr}`)
  }
  if (typeof val[1] !== 'number') {
    throw new Error(`Error in game report at field [1]. Expected 'number'. Got ${typeof val[1]}.\n${valStr}`)
  }
  if (typeof val[2] !== 'string') {
    throw new Error(`Error in game report at field [2]. Expected 'string'. Got ${typeof val[2]}.\n${valStr}`)
  }
  if (typeof val[3] !== 'string') {
    throw new Error(`Error in game report at field [3]. Expected 'string'. Got ${typeof val[3]}.\n${valStr}`)
  }
  if (!isExpansion(val[4])) {
    throw new Error(`Error in game report at field [4]. Expected Expansion. Got ${typeof val[4]}.\n${valStr}`)
  }
  if (!isVictory(val[5])) {
    throw new Error(`Error in game report at field [5]. Expected Victory. Got ${typeof val[5]}.\n${valStr}`)
  }
  if (!isCompetitive(val[6])) {
    throw new Error(`Error in game report at field [6]. Expected Competitive. Got ${typeof val[6]}.\n${valStr}`)
  }
  if (!isYesBox(val[7])) {
    throw new Error(`Error in game report at field [7]. Expected YesBox. Got ${typeof val[7]}.\n${valStr}`)
  }
  if (!isYesBox(val[8])) {
    throw new Error(`Error in game report at field [8]. Expected YesBox. Got ${typeof val[8]}.\n${valStr}`)
  }
  if (!isYesBox(val[9])) {
    throw new Error(`Error in game report at field [9]. Expected YesBox. Got ${typeof val[9]}.\n${valStr}`)
  }
  if (typeof val[10] !== 'string') {
    throw new Error(`Error in game report at field [10]. Expected 'string'. Got ${typeof val[10]}.\n${valStr}`)
  }
  if (typeof val[11] !== 'string') {
    throw new Error(`Error in game report at field [11]. Expected 'string'. Got ${typeof val[11]}.\n${valStr}`)
  }
  if (typeof val[12] !== 'number') {
    throw new Error(`Error in game report at field [12]. Expected 'number'. Got ${typeof val[12]}.\n${valStr}`)
  }
  if (!isTickBox(val[13])) {
    throw new Error(`Error in game report at field [13]. Expected TickBox. Got ${typeof val[13]}.\n${valStr}`)
  }
  if (typeof val[14] !== 'number') {
    throw new Error(`Error in game report at field [14]. Expected 'number'. Got ${typeof val[14]}.\n${valStr}`)
  }
  if (typeof val[15] !== 'number') {
    throw new Error(`Error in game report at field [15]. Expected 'number'. Got ${typeof val[15]}.\n${valStr}`)
  }
  if (!isTickBox(val[16])) {
    throw new Error(`Error in game report at field [16]. Expected TickBox. Got ${typeof val[16]}.\n${valStr}`)
  }
  if (typeof val[17] !== 'number') {
    throw new Error(`Error in game report at field [17]. Expected 'number'. Got ${typeof val[17]}.\n${valStr}`)
  }
  if (!isTickBox(val[18])) {
    throw new Error(`Error in game report at field [18]. Expected TickBox. Got ${typeof val[18]}.\n${valStr}`)
  }
  if (!isTickBox(val[19])) {
    throw new Error(`Error in game report at field [19]. Expected TickBox. Got ${typeof val[19]}.\n${valStr}`)
  }
  if (!isTickBox(val[20])) {
    throw new Error(`Error in game report at field [20]. Expected TickBox. Got ${typeof val[20]}.\n${valStr}`)
  }
  if (!isTickBox(val[21])) {
    throw new Error(`Error in game report at field [21]. Expected TickBox. Got ${typeof val[21]}.\n${valStr}`)
  }
  if (!isTickBox(val[22])) {
    throw new Error(`Error in game report at field [22]. Expected TickBox. Got ${typeof val[22]}.\n${valStr}`)
  }
  if (!isTickBox(val[23])) {
    throw new Error(`Error in game report at field [23]. Expected TickBox. Got ${typeof val[23]}.\n${valStr}`)
  }
  if (!isTickBox(val[24])) {
    throw new Error(`Error in game report at field [24]. Expected TickBox. Got ${typeof val[24]}.\n${valStr}`)
  }
  if (!isTickBox(val[25])) {
    throw new Error(`Error in game report at field [25]. Expected TickBox. Got ${typeof val[25]}.\n${valStr}`)
  }
  if (!isTickBox(val[26])) {
    throw new Error(`Error in game report at field [26]. Expected TickBox. Got ${typeof val[26]}.\n${valStr}`)
  }
  if (!isTickBox(val[27])) {
    throw new Error(`Error in game report at field [27]. Expected TickBox. Got ${typeof val[27]}.\n${valStr}`)
  }
  if (!isTickBox(val[28])) {
    throw new Error(`Error in game report at field [28]. Expected TickBox. Got ${typeof val[28]}.\n${valStr}`)
  }
  if (!isTickBox(val[29])) {
    throw new Error(`Error in game report at field [29]. Expected TickBox. Got ${typeof val[29]}.\n${valStr}`)
  }
  if (!isTickBox(val[30])) {
    throw new Error(`Error in game report at field [30]. Expected TickBox. Got ${typeof val[30]}.\n${valStr}`)
  }
  if (typeof val[31] !== 'number' && val[31] !== '') {
    throw new Error(`Error in game report at field [31]. Expected 'number' or ''. Got ${typeof val[31]}.\n${valStr}`)
  }
  if (typeof val[32] !== 'string') {
    throw new Error(`Error in game report at field [32]. Expected 'string'. Got ${typeof val[32]}.\n${valStr}`)
  }
  if (typeof val[33] !== 'string') {
    throw new Error(`Error in game report at field [33]. Expected 'string'. Got ${typeof val[33]}.\n${valStr}`)
  }
  if (!isTickBox(val[34])) {
    throw new Error(`Error in game report at field [34]. Expected TickBox. Got ${typeof val[34]}.\n${valStr}`)
  }
  if (!isTickBox(val[35])) {
    throw new Error(`Error in game report at field [35]. Expected TickBox. Got ${typeof val[35]}.\n${valStr}`)
  }
  if (!isTickBox(val[36])) {
    throw new Error(`Error in game report at field [36]. Expected TickBox. Got ${typeof val[36]}.\n${valStr}`)
  }
  if (!isTickBox(val[37])) {
    throw new Error(`Error in game report at field [37]. Expected TickBox. Got ${typeof val[37]}.\n${valStr}`)
  }
  if (!isTickBox(val[38])) {
    throw new Error(`Error in game report at field [38]. Expected TickBox. Got ${typeof val[38]}.\n${valStr}`)
  }
  if (!isTickBox(val[39])) {
    throw new Error(`Error in game report at field [39]. Expected TickBox. Got ${typeof val[39]}.\n${valStr}`)
  }
  if (!isTickBox(val[40])) {
    throw new Error(`Error in game report at field [40]. Expected TickBox. Got ${typeof val[40]}.\n${valStr}`)
  }
  if (!isTickBox(val[41])) {
    throw new Error(`Error in game report at field [41]. Expected TickBox. Got ${typeof val[41]}.\n${valStr}`)
  }
  if (!isTickBox(val[42])) {
    throw new Error(`Error in game report at field [42]. Expected TickBox. Got ${typeof val[42]}.\n${valStr}`)
  }
  if (!isTickBox(val[43])) {
    throw new Error(`Error in game report at field [43]. Expected TickBox. Got ${typeof val[43]}.\n${valStr}`)
  }
  if (!isTickBox(val[44])) {
    throw new Error(`Error in game report at field [44]. Expected TickBox. Got ${typeof val[44]}.\n${valStr}`)
  }
  if (!isTickBox(val[45])) {
    throw new Error(`Error in game report at field [45]. Expected TickBox. Got ${typeof val[45]}.\n${valStr}`)
  }
  if (!isTickBox(val[46])) {
    throw new Error(`Error in game report at field [46]. Expected TickBox. Got ${typeof val[46]}.\n${valStr}`)
  }
  const report = val as WotrReportRow
  // Remove leading/trailing whitespace from reported winner/loser names
  report[2] = report[2].trim()
  report[3] = report[3].trim()
  return report
}

export const WOTR_LADDER_ROW_LENGTH = 7
export type WotrLadderRow = [
  rank: number,
  flag: unknown, // This is a CellImage. Google doesn't seem to publish this type? I couldn't find it.
  name: string,
  rating: number,
  shadowRating: number,
  freeRating: number,
  gamesPlayed: number
]
export function parseWotrLadderRow (val: unknown): WotrLadderRow {
  // Check if a line represents the ladder entry that divides active and inactive players.
  // This is a bit of a workaround -- this row (and this row only) has a value of '' for shadowRating, freeRating,
  // and gamesPlayed. Since the row is never *accessed* by the ladder update process, we don't really want to make these
  // fields nullable. So we just detect the special case and do a blind cast when the row is returned. Technically, this
  // is a type error...we claim `number` when we really have `string`. But it's the best I've got right now.
  const isNotActiveDivider = (val: unknown): boolean =>
    Array.isArray(val) && val[2] === 'NOT ACTIVE PLAYERS' && val[4] === '' && val[5] === '' && val[6] === ''

  const valStr = val as string

  if (!Array.isArray(val)) {
    throw new Error(`Error in ladder entry. Value is not an array.\n${valStr}`)
  }
  if (val.length !== WOTR_LADDER_ROW_LENGTH) {
    throw new Error(`Error in ladder entry. Expected ${WOTR_LADDER_ROW_LENGTH} entries. Got ${val.length}.\n${valStr}`)
  }
  if (typeof val[0] !== 'number') {
    throw new Error(`Error in ladder entry at field [0]. Expected 'number'. Got ${typeof val[0]}.\n${valStr}`)
  }
  // No check for val[1]
  if (typeof val[2] !== 'string') {
    throw new Error(`Error in ladder entry at field [2]. Expected 'string'. Got ${typeof val[2]}.\n${valStr}`)
  }
  if (typeof val[3] !== 'number') {
    throw new Error(`Error in ladder entry at field [3]. Expected 'number'. Got ${typeof val[3]}.\n${valStr}`)
  }
  if (typeof val[4] !== 'number' && !isNotActiveDivider(val)) {
    throw new Error(`Error in ladder entry at field [4]. Expected 'number'. Got ${typeof val[4]}.\n${valStr}`)
  }
  if (typeof val[5] !== 'number' && !isNotActiveDivider(val)) {
    throw new Error(`Error in ladder entry at field [5]. Expected 'number'. Got ${typeof val[5]}.\n${valStr}`)
  }
  if (typeof val[6] !== 'number' && !isNotActiveDivider(val)) {
    throw new Error(`Error in ladder entry at field [6]. Expected 'number'. Got ${typeof val[6]}.\n${valStr}`)
  }
  const entry = val as WotrLadderRow
  // Remove leading/trailing whitespace from player name
  entry[2] = entry[2].trim()
  return entry
}

export type WotrSide = 'Shadow' | 'Free'

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
