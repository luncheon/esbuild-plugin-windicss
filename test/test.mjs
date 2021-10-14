import assert from 'assert'
import path from 'path'
import esbuild from 'esbuild'
import pipe from 'esbuild-plugin-pipe'
import windiCssPlugin from '../index.js'
import url from 'url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const test1 = async parser => {
  const built = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'app.ts')],
    outdir: 'dist',
    write: false,
    bundle: true,
    minify: true,
    plugins: [
      windiCssPlugin({
        parser,
        windiCssConfig: { prefixer: false },
      }),
    ],
  })
  console.log(built.outputFiles[1].text)

  const css = built.outputFiles[1].text.replace(/ /g, '')
  assert(css.includes('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert.strictEqual(css.indexOf('.mx-4{margin-left:1rem;margin-right:1rem}'), css.lastIndexOf('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert(css.includes('@media(min-width:640px){.sm\\:m-auto{margin:auto}}'))
  assert(css.includes('.bg-green-300{'))
  assert(css.includes('.bg-red-300{'))
  assert(css.includes('.grid{display:grid}'))
}

const test2 = async parser => {
  const windiCss = windiCssPlugin({ filter: /^$/, parser })
  const built = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'app.ts')],
    outdir: 'dist',
    write: false,
    bundle: true,
    minify: true,
    plugins: [
      pipe({
        filter: /\.[jt]sx?$/,
        plugins: [windiCss],
      }),
      windiCss,
    ],
  })
  console.log(built.outputFiles[1].text)

  const css = built.outputFiles[1].text.replace(/ /g, '')
  assert(css.includes('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert.strictEqual(css.indexOf('.mx-4{margin-left:1rem;margin-right:1rem}'), css.lastIndexOf('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert(css.includes('@media(min-width:640px){.sm\\:m-auto{margin:auto}}'))
  assert(css.includes('.bg-green-300{'))
  assert(css.includes('.bg-red-300{'))
  assert(css.includes('.grid{display:-ms-grid;display:grid}'))
}

const main = async () => {
  await test1('babel')
  await test2('babel')
  await test1('swc')
  await test2('swc')
  await test1('sucrase')
  await test2('sucrase')
  console.log('success')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
