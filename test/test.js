const assert = require('assert')
const path = require('path')

const main = async () => {
  const built = await require('esbuild').build({
    entryPoints: [path.resolve(__dirname, 'app.ts')],
    outdir: 'dist',
    write: false,
    bundle: true,
    minify: true,
    plugins: [require('..')()],
  })
  console.log(built.outputFiles[1].text)

  const css = built.outputFiles[1].text.replace(/ /g, '')
  assert(css.includes('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert.strictEqual(css.indexOf('.mx-4{margin-left:1rem;margin-right:1rem}'), css.lastIndexOf('.mx-4{margin-left:1rem;margin-right:1rem}'))
  assert(css.includes('@media(min-width:640px){.sm\\:m-auto{margin:auto}}'))
  assert(css.includes('.bg-green-300{'))
  assert(css.includes('.bg-red-300{'))

  console.log('success')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
