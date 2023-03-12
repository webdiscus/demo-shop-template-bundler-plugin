const fs = require('fs');
const path = require('path');
const glob = require('glob-all');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const HtmlBundlerPlugin = require('html-bundler-webpack-plugin');
const Handlebars = require('handlebars');

const PATHS = {
  pages: path.join(__dirname, 'src/views/pages/'),
  partials: path.join(__dirname, 'src/views/partials/'),
};

// Handlebars helpers used in templates.
const handlebarsHelpers =  {
  /**
   * Include the partial file into a template.
   * @param {string} filename The partial file name.
   * @param {Object} options The options passed via tag attributes into a template.
   * @param {Object} args The parent options passed using the `this` attribute.
   * @return {Handlebars.SafeString}
   */
  include: (filename, options, args) => {
    const tmplExt = '.html';
    const { ext } = path.parse(filename);
    if (!ext) filename += tmplExt;
    const template = fs.readFileSync(`${PATHS.partials}${filename}`, 'utf8');
    // pass the original data into sub-sub partials
    const data = options.name === 'include' ? {...options?.hash, ...options.data?.root} : {...options, ...args?.data?.root};
    const html = Handlebars.compile(template)(data);
    return new Handlebars.SafeString(html);
  },
  limit: (arr, limit) => {
    if (!Array.isArray(arr)) { return []; }
    return arr.slice(0, limit);
  }
};

// Register handlebars helpers.
for (const helper in handlebarsHelpers) {
  Handlebars.registerHelper(helper, handlebarsHelpers[helper]);
}

// Project config data.
// Go here to change stuff for the whole demo, ie, change the navbar.
// Also go here for the various data loops, ie, category products, slideshows.
const projectData = merge(
    { webRoot: '' },
    {config: require(path.join(__dirname, 'src/data/config.json')) },
  { 'category-products': require(path.join(__dirname, 'src/data/category-products.json')) },
  { 'cart-items': require(path.join(__dirname, 'src/data/cart-items.json')) },
  { 'filters-one': require(path.join(__dirname, 'src/data/filters-one.json')) },
  { 'options-size-one': require(path.join(__dirname, 'src/data/options-size-one.json')) },
  { 'options-size-two': require(path.join(__dirname, 'src/data/options-size-two.json')) },
  { 'slideshow-brands-one': require(path.join(__dirname, 'src/data/slideshow-brands-one.json')) },
);

// Create the entry object containing pages located in src/views/pages/ directory.
const entry = {};
glob.sync(path.join(PATHS.pages, '/**/*.html')).map((file) => {
  const name = path.relative(PATHS.pages, file).replace(/\.html$/, '');
  entry[name] = file;
})

// Main webpack config options.
module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'inline-source-map' :  'source-map' ,
    stats: 'minimal',

    output: {
      path: path.join(__dirname, 'dist/'),
    },

    resolve: {
      alias: {
        '@images': path.join(__dirname, 'src/assets/images'),
        '@fonts': path.join(__dirname, 'src/assets/fonts'),
        '@styles': path.join(__dirname, 'src/assets/scss'),
        '@scripts': path.join(__dirname, 'src/assets/js'),
      }
    },

    plugins: [
      new webpack.ProgressPlugin(),

      new HtmlBundlerPlugin({
        // automatically detect pages in ./src/views/pages/ folder
        entry,

        // you can manually define pages
        // entry: {
        //   index: './src/views/pages/index.html',
        //   category: './src/views/pages/category.html',
        //   product: './src/views/pages/product.html',
        //   cart: './src/views/pages/cart.html',
        //   checkout: './src/views/pages/checkout.html',
        //   'about/index': 'src/views/pages/about/index.html',
        // },

        js: {
          // output filename of extracted JS
          filename: 'assets/js/[name].[contenthash:8].js',
        },
        css: {
          // output filename of extracted CSS
          filename: 'assets/css/[name].[contenthash:8].css',
        },

        loaderOptions: {
          preprocessor: (content) => Handlebars.compile(content)(projectData),
        },
      }),
    ],

    module: {
      rules: [
        {
          test: /\.(sass|scss|css)$/,
          use: ['css-loader', 'postcss-loader', 'sass-loader'],
          //use: ['css-loader', 'sass-loader'],
        },
        {
          test: /[\\/]images[\\/].+(png|jpe?g|webp|ico|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/img/[name].[hash:8][ext]',
          },
        },
        {
          test: /[\\/]fonts[\\/].+(woff2?|ttf|otf|eot|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]',
          },
        },
      ],
    },

    optimization: {
      splitChunks: {
        cacheGroups: {
          vendor: {
            test:   /[\\/](node_modules)[\\/].+\.js$/,
            name:   'vendor',
            chunks: 'all'
          }
        }
      },
    },

    performance: {
      hints: false,
    },

    // enable HMR with live reload
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      watchFiles: {
        paths: ['src/**/*.*'],
        options: {
          usePolling: true,
        },
      },
    },

  };
}
