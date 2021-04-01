# esbuild-plugin-windicss

An unofficial and experimental [esbuild](https://esbuild.github.io/) plugin for [Windi CSS](https://windicss.org/).  
This plugin uses [@babel/parser](https://babeljs.io/docs/en/babel-parser) to extract string literals from source code.

## Installation

```sh
$ npm i -D esbuild luncheon/esbuild-plugin-windicss
```

## Usage Example

- build.js

```js
const esbuild = require('esbuild')
const windiCssPlugin = require('@luncheon/esbuild-plugin-windicss')

esbuild.build({
  entryPoints: ['src/app.ts'],
  outdir: 'dist',
  bundle: true,
  plugins: [windiCssPlugin()],
})
```

- src/app.ts

```tsx
let green = false
document.body.className = `mx-4 sm:m-auto ${green ? 'bg-green-300' : 'bg-red-300'}`
```

Run build.js

```sh
$ node build.js
```

Then two files will be output

- dist/app.js

```js
(()=>{var s=!1;document.body.className=`mx-4 sm:m-auto ${s?"bg-green-300":"bg-red-300"}`;})();
```

- dist/app.css

```css
.bg-green-300{--tw-bg-opacity: 1;background-color:rgba(110,231,183,var(--tw-bg-opacity))}.bg-red-300{--tw-bg-opacity: 1;background-color:rgba(252,165,165,var(--tw-bg-opacity))}.mx-4{margin-left:1rem;margin-right:1rem}@media (min-width: 640px){.sm\:m-auto{margin:auto}}
```

## Options

The following are the options for this plugin and their default values.

```js
windiCssPlugin({
  filter: /\.[jt]sx?$/,
  preprocess: (code, args) => code,
  babelParserOptions: {
    errorRecovery: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    tokens: true,
    plugins: ['jsx', 'typescript'],
  },
})
```

- `filter` is an option for esbuild to narrow down the files to which this plugin should be applied.  
  https://esbuild.github.io/plugins/#filters
- `babelParserOptions` is passed to the `@babel/parser`.  
  https://babeljs.io/docs/en/babel-parser

## License

[WTFPL](http://www.wtfpl.net/)

