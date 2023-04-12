const path = require('path')
const GasPlugin = require('gas-webpack-plugin')

const config = {
  entry: './src/update.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['ts-loader'],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts']
  },
  plugins: [new GasPlugin({ autoGlobalExportsFiles: ['src/update.ts'] })]
}

module.exports = config
