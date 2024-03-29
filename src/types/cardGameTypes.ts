/**
 * Type library for deserialization of data read from the spreadsheet.
 *
 * Google's APIs return untyped data. Getting cell values is generally type any[][], representing an array of rows
 * where each row is an array of anything. Since the data in the sheet is structured in a known format, these parsers,
 * types, and guards let us deal with the data in a strongly typed way.
 *
 * Types for the WotR Card Game
 */
import { createTypeGuard, unionParser } from './types'

const COMPETITIVE = ['Friendly', 'Ladder'] as const
const isCompetitive = createTypeGuard(unionParser(COMPETITIVE))
export type CardCompetitive = (typeof COMPETITIVE)[number]

const WINNER = ['FP', 'SP', 'Two Tower / Return of the King'] as const
const isWinner = createTypeGuard(unionParser(WINNER))
export type CardWinner = (typeof WINNER)[number]

const GAME_TYPE = [
  'Expert Duel',
  'Duel',
  'Fellowship of the Ring',
  'Trilogy Scenario 4 hands game',
  'The Two Towers',
  'Return of the King'
] as const
const isGameType = createTypeGuard(unionParser(GAME_TYPE))
export type CardGameType = (typeof GAME_TYPE)[number]

const YES_NO = ['Yes', 'No'] as const
const isYesNo = createTypeGuard(unionParser(YES_NO))
export type YesNo = (typeof YES_NO)[number]

export const CARD_REPORT_ROW_LENGTH = 14
export type CardReportRow = [
  timestamp: Date,
  witchKingPlayer: string,
  sarumanPlayer: string,
  frodoPlayer: string,
  aragornPlayer: string,
  competitive: CardCompetitive,
  winner: CardWinner,
  fpPoints: number,
  spPoints: number,
  pathNumber: number,
  promo: YesNo,
  players: number,
  gameType: CardGameType | '',
  corruption: number | '6+' | ''
]
export function parseCardReportRow (val: unknown): CardReportRow {
  const valStr = val as string

  if (!Array.isArray(val)) {
    throw new Error(`Error in game report. Value is not an array.\n${valStr}`)
  }
  if (val.length !== CARD_REPORT_ROW_LENGTH) {
    throw new Error(`Error in game report. Expected ${CARD_REPORT_ROW_LENGTH} entries. Got ${val.length}.\n${valStr}`)
  }
  if (Object.prototype.toString.call(val[0]) !== '[object Date]') {
    throw new Error(`Error in game report at field [0]. Expected 'Date'. Got ${typeof val[0]}.\n${valStr}`)
  }
  if (typeof val[1] !== 'string') {
    throw new Error(`Error in game report at field [1]. Expected 'string'. Got ${typeof val[1]}.\n${valStr}`)
  }
  if (typeof val[2] !== 'string') {
    throw new Error(`Error in game report at field [2]. Expected 'string'. Got ${typeof val[2]}.\n${valStr}`)
  }
  if (typeof val[3] !== 'string') {
    throw new Error(`Error in game report at field [3]. Expected 'string'. Got ${typeof val[3]}.\n${valStr}`)
  }
  if (typeof val[4] !== 'string') {
    throw new Error(`Error in game report at field [4]. Expected 'string'. Got ${typeof val[4]}.\n${valStr}`)
  }
  if (!isCompetitive(val[5])) {
    throw new Error(`Error in game report at field [5]. Expected Competitive. Got ${typeof val[5]}.\n${valStr}`)
  }
  if (!isWinner(val[6])) {
    throw new Error(`Error in game report at field [6]. Expected Winner. Got ${typeof val[6]}.\n${valStr}`)
  }
  if (typeof val[7] !== 'number') {
    throw new Error(`Error in game report at field [7]. Expected 'number'. Got ${typeof val[7]}.\n${valStr}`)
  }
  if (typeof val[8] !== 'number') {
    throw new Error(`Error in game report at field [8]. Expected 'number'. Got ${typeof val[8]}.\n${valStr}`)
  }
  if (typeof val[9] !== 'number') {
    throw new Error(`Error in game report at field [9]. Expected 'number'. Got ${typeof val[9]}.\n${valStr}`)
  }
  if (!isYesNo(val[10])) {
    throw new Error(`Error in game report at field [10]. Expected Yes|No. Got ${typeof val[10]}.\n${valStr}`)
  }
  if (typeof val[11] !== 'number') {
    throw new Error(`Error in game report at field [11]. Expected 'number'. Got ${typeof val[11]}.\n${valStr}`)
  }
  if (!isGameType(val[12]) && val[12] !== '') {
    throw new Error(`Error in game report at field [12]. Expected GameType or ''. Got ${typeof val[12]}.\n${valStr}`)
  }
  if ((typeof val[13] !== 'number' && val[13] !== '' && val[13] !== '6+')) {
    throw new Error(`Error in game report at field [13]. Expected number or ''. Got ${typeof val[13]}.\n${valStr}`)
  }
  const entry = val as CardReportRow
  // Remove leading/trailing whitespace from each player name
  entry[1] = entry[1].trim()
  entry[2] = entry[2].trim()
  entry[3] = entry[3].trim()
  entry[4] = entry[4].trim()
  return entry
}

export const CARD_LADDER_ROW_LENGTH = 14
export type CardLadderRow = [
  rank: number,
  flag: unknown, // This is a CellImage. Google doesn't seem to publish this type? I couldn't find it.
  name: string,
  averageRating: number,
  witchKingRating: number,
  sarumanRating: number,
  frodoRating: number,
  aragornRating: number,
  averageFPRating: number,
  averageSPRating: number,
  gamesPlayed: number,
  gamesPlayed4: number,
  gamesPlayed3: number,
  gamesPlayed2: number,
]
export function parseCardLadderRow (val: unknown): CardLadderRow {
  const valStr = val as string

  if (!Array.isArray(val)) {
    throw new Error(`Error in ladder entry. Value is not an array.\n${valStr}`)
  }
  if (val.length !== CARD_LADDER_ROW_LENGTH) {
    throw new Error(`Error in ladder entry. Expected ${CARD_LADDER_ROW_LENGTH} entries. Got ${val.length}.\n${valStr}`)
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
  if (typeof val[4] !== 'number') {
    throw new Error(`Error in ladder entry at field [4]. Expected 'number'. Got ${typeof val[4]}.\n${valStr}`)
  }
  if (typeof val[5] !== 'number') {
    throw new Error(`Error in ladder entry at field [5]. Expected 'number'. Got ${typeof val[5]}.\n${valStr}`)
  }
  if (typeof val[6] !== 'number') {
    throw new Error(`Error in ladder entry at field [6]. Expected 'number'. Got ${typeof val[6]}.\n${valStr}`)
  }
  if (typeof val[7] !== 'number') {
    throw new Error(`Error in ladder entry at field [7]. Expected 'number'. Got ${typeof val[7]}.\n${valStr}`)
  }
  if (typeof val[8] !== 'number') {
    throw new Error(`Error in ladder entry at field [8]. Expected 'number'. Got ${typeof val[8]}.\n${valStr}`)
  }
  if (typeof val[9] !== 'number') {
    throw new Error(`Error in ladder entry at field [9]. Expected 'number'. Got ${typeof val[9]}.\n${valStr}`)
  }
  if (typeof val[10] !== 'number') {
    throw new Error(`Error in ladder entry at field [10]. Expected 'number'. Got ${typeof val[10]}.\n${valStr}`)
  }
  if (typeof val[11] !== 'number') {
    throw new Error(`Error in ladder entry at field [11]. Expected 'number'. Got ${typeof val[11]}.\n${valStr}`)
  }
  if (typeof val[12] !== 'number') {
    throw new Error(`Error in ladder entry at field [12]. Expected 'number'. Got ${typeof val[12]}.\n${valStr}`)
  }
  if (typeof val[13] !== 'number') {
    throw new Error(`Error in ladder entry at field [13]. Expected 'number'. Got ${typeof val[13]}.\n${valStr}`)
  }
  const entry = val as CardLadderRow
  // Remove leading/trailing whitespace from player name
  entry[2] = entry[2].trim()
  return entry
}

export type CardRole = 'WitchKing' | 'Saruman' | 'Frodo' | 'Aragorn'

export type CardSide = 'Shadow' | 'Free'
