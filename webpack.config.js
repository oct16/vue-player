module.exports = {
    entry: './src/main.js',
    output: {
        path: __dirname + '/dist',
        publicPath: '/dist/',
        filename: './bundle.js',
        chunkFilename: "[id].build.js?[chunkhash]"
    },
    module: {
        loaders: [
            {
                test: /\.vue$/,
                loader: 'vue'
            },
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: /node_modules/
            },
            {
                test: /\.(css|less)/,
                loader: 'style-loader!css-loader!less-loader'
            }, {
                test: /\.html$/,
                loader: 'html'
            }, {
                test: /\.json/,
                loader: 'json'
            }, {
                test: /\.(md|lrc)$/,
                loader: 'raw'
            }
        ]
    },
    babel: {
        presets: ['es2015', 'stage-0'],
        plugins: ['transform-runtime']
    }
}
