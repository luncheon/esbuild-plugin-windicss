import { parse, ParserOptions } from '@babel/parser'
import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import WindiCss from 'windicss'
import { StyleSheet } from 'windicss/utils/style'

interface EsbuildPipeableTransformArgs {
  readonly args: OnLoadArgs
  readonly contents: string
}

interface EsbuildPipeablePlugin extends Plugin {
  setup: (build: PluginBuild, pipe?: { transform: EsbuildPipeableTransformArgs }) => void | OnLoadResult
}

interface EsbuildPluginWindiCssOptions {
  readonly filter?: RegExp
  readonly babelParserOptions?: ParserOptions
  readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0]
}

interface EsbuildPluginWindiCss {
  (options?: EsbuildPluginWindiCssOptions): EsbuildPipeablePlugin
  default: EsbuildPluginWindiCss
}

const pluginName = 'esbuild-plugin-windicss'

const ignoredClassPattern = RegExp(`\\b(${Object.getOwnPropertyNames(Object.prototype).join('|')})\\b`, 'g')

const plugin: EsbuildPluginWindiCss = ({ filter, babelParserOptions, windiCssConfig } = {}) => {
  const resolvedBabelParserOptions: ParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
    errorRecovery: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    allowUndeclaredExports: true,
    tokens: true,
    plugins: ['jsx', 'typescript', 'classProperties'],
  }
  const windiCss = new WindiCss(windiCssConfig)
  const cssFileContentsMap = new Map<string, string>()
  const transform = ({ args, contents }: EsbuildPipeableTransformArgs) => {
    const styleSheet = new StyleSheet()
    for (const token of parse(contents, resolvedBabelParserOptions).tokens!) {
      if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
        const interpreted = windiCss.interpret(token.value.replace(ignoredClassPattern, ' ').trim(), true)
        if (interpreted.success.length !== 0) {
          styleSheet.extend(interpreted.styleSheet)
        }
      }
    }
    if (styleSheet.children.length !== 0) {
      const cssFilename = `${args.path}.${pluginName}.css`
      cssFileContentsMap.set(cssFilename, styleSheet.combine().sort().build(true))
      contents = `import '${cssFilename}'\n${contents}`
    }
    return { contents, loader: path.extname(args.path).slice(1) as 'js' | 'jsx' | 'ts' | 'tsx' }
  }
  return {
    name: pluginName,
    setup(build, pipe) {
      if (pipe?.transform) {
        return transform(pipe.transform)
      }
      build.onLoad({ filter: filter ?? /\.[jt]sx?$/ }, async args => {
        try {
          return transform({ args, contents: await fs.promises.readFile(args.path, 'utf8') })
        } catch (error) {
          return { errors: [{ text: error.message }] }
        }
      })
      build.onResolve({ filter: RegExp(String.raw`\.${pluginName}\.css`) }, ({ path }) => ({ path, namespace: pluginName }))
      build.onLoad({ filter: RegExp(String.raw`\.${pluginName}\.css`), namespace: pluginName }, ({ path }) => {
        const contents = cssFileContentsMap.get(path)
        return contents ? { contents, loader: 'css' } : undefined
      })
    },
  }
}

export = plugin.default = plugin
