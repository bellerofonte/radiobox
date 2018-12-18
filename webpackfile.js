const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env = {}) => {
    const srcDir = path.join(__dirname, 'src/client');
    const distDir = env.dist ? path.join(process.cwd(), env.dist) : path.join(__dirname, 'target/client');
    
    const config = {
        context: srcDir,
        module: {
            rules: [{
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['es2015', 'stage-2', 'react']
                    }
                }]
            },{
                test: /\.css$/,
                loader: 'style-loader!css-loader?modules&camelCase'
            },{
                test: /\.html$/,
                loader: 'file-loader?name=[path][name].[ext]!extract-loader!html-loader'
            }]
        },
        plugins: [
            new webpack.LoaderOptionsPlugin({
                test: /\.css$/,
                options: {
                    postcss: [
                        require('stylelint'),
                        require('autoprefixer')({ browsers: ['defaults'] })
                    ]
                }
            }),
            new webpack.DefinePlugin({
                'RADIOBOX_DEBUG': JSON.stringify(process.env.DEBUG || ''),
                'RADIOBOX_HOST': JSON.stringify(process.env.HOST || '')
            }),
            new webpack.ProvidePlugin({
                URL: 'url-parse'
            }),
            new CopyWebpackPlugin([
                {from:'icons',to:'icons'}
            ]),
            new CopyWebpackPlugin([
                {from:'../server',to:'../'}
            ]),
        ],
        output: {
            filename: 'index.js',
            path: distDir,
            devtoolModuleFilenameTemplate: function(info) {
                // HACK use path.relative twice
                const filename = path.relative(__dirname, info.absoluteResourcePath);
                return path.relative(__dirname, filename);
            }
        },
        resolve: {
            extensions: ['.js', '.jsx']
        },
        performance: {
            hints: false
        },
        devServer: {
            contentBase: distDir,
            noInfo: true,
            port: 8000
        },
        // TODO https://github.com/webpack/webpack/issues/2145
        devtool: env.devtool || 'inline-source-map'
    };

    if (env.karma) {
        // do nothing
    } else {
        Object.assign(config, {
            entry: ['./index.jsx', './index.html']
        });
    }

    return config;
};
