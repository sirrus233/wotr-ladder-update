/**
 * Type library for deserialization of data read from the spreadsheet.
 *
 * Google's APIs return untyped data. Getting cell values is generally type any[][], representing an array of rows
 * where each row is an array of anything. Since the data in the sheet is structured in a known format, these parsers,
 * types, and guards let us deal with the data in a strongly typed way.
 *
 * Types for the WotR Card Game
 */
