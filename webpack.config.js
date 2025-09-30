const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

const PLUGIN_PORT = 3033;

module.exports = {
  mode: "development",
  entry: "./src/index",
  output: {
    // path: path.resolve(
    //   __dirname,
    //   "C:\\Users\\beck\\Documents\\GitHub\\brain_drive\\BrainDrive\\backend\\plugins\\shared\\ChatWithYourDocuments\\v1.0.1\\dist"
    // ),
    path: path.resolve(
      __dirname,
      "dist"
    ),
    publicPath: "auto",
    clean: true,
    library: {
      type: 'var',
      name: "ChatWithYourDocuments"
    }
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: "ts-loader",
        exclude: [
          /node_modules/,
          /\.test\.(ts|tsx)$/,
          /\.spec\.(ts|tsx)$/,
          path.resolve(__dirname, 'src/dev-standalone.tsx')
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "ChatWithYourDocuments",
      library: { type: "var", name: "ChatWithYourDocuments" },
      filename: "remoteEntry.js",
      exposes: {
        "./ChatWithYourDocumentsModule": "./src/index",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
          eager: true
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
          eager: true
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  devServer: {
    port: PLUGIN_PORT,
    static: {
      directory: path.join(__dirname, "public"),
    },
    hot: true,
  },
};
