const path = require('path')
const esbuild = require('esbuild')
const windiCssPlugin = require('..')
const windiCss = windiCssPlugin({ windiCssConfig: { prefixer: false } })

esbuild
  .serve(
    { servedir: __dirname },
    {
      entryPoints: [path.resolve(__dirname, 'app.ts')],
      bundle: true,
      minify: true,
      plugins: [windiCss],
    }
  )
  .then(({ port }) => console.log(`http://localhost:${port}/`))
