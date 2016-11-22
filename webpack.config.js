var webpack = require('webpack')
var MINIFY = process.argv.indexOf('--minimize') !== -1

module.exports = {
    entry: './index.js',
    output: {
        path: "./dist/",
        filename: MINIFY ? 'jobq.min.js': 'jobq.js',
        library: 'JobQ'
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ["", ".webpack.js", ".web.js", ".js"]
    },
    plugins: MINIFY ? [
      new webpack.optimize.UglifyJsPlugin({
        compress: { warnings: false }
      })
    ] : [],
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            presets: ['es2015']
          }
        }
      ]
    }
}