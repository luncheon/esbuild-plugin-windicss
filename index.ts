import WindiCss from 'windicss'
import { parse, ParserOptions } from '@babel/parser'
import type { Plugin, OnLoadArgs } from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'

const name = 'esbuild-plugin-windicss'

interface EsbuildPluginWindiCssOptions {
  readonly filter?: RegExp
  readonly preprocess?: (code: string, args: OnLoadArgs) => string
  readonly babelParserOptions?: ParserOptions
  readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0]
}

interface EsbuildPluginWindiCss {
  (options?: EsbuildPluginWindiCssOptions): Plugin
  default: EsbuildPluginWindiCss
}

const plugin: EsbuildPluginWindiCss = ({ filter, preprocess, babelParserOptions, windiCssConfig } = {}) => ({
  name,
  setup(build) {
    const resolvedBabelParserOptions: ParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
      errorRecovery: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      allowUndeclaredExports: true,
      tokens: true,
      plugins: ['jsx', 'typescript'],
    }
    const windiCss = new WindiCss(windiCssConfig)
    const cssFileContentsMap = new Map<string, string>()

    build.onLoad({ filter: filter ?? /\.[jt]sx?$/ }, async args => {
      let code = await fs.promises.readFile(args.path, 'utf8')
      code = preprocess ? preprocess(code, args) : code
      try {
        const classNames = new Set<string>()
        for (const token of parse(code, resolvedBabelParserOptions).tokens!) {
          if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
            classNames.add(token.value)
          }
        }
        const result = windiCss.interpret([...classNames].join(' '), true)
        if (result.success.length !== 0) {
          const cssFilename = `${args.path}.${name}.css`
          cssFileContentsMap.set(cssFilename, result.styleSheet.build())
          code = `import '${cssFilename}'\n${code}`
        }
        return { contents: code, loader: path.extname(args.path).slice(1) as 'js' | 'jsx' | 'ts' | 'tsx' }
      } catch (error) {
        return { errors: [{ text: error.message }] }
      }
    })

    build.onResolve({ filter: RegExp(String.raw`\.${name}\.css`) }, ({ path }) => ({ path, namespace: name }))
    build.onLoad({ filter: RegExp(String.raw`\.${name}\.css`), namespace: name }, ({ path }) => {
      const contents = cssFileContentsMap.get(path)
      return contents ? { contents, loader: 'css' } : undefined
    })
  },
})

export = plugin.default = plugin
