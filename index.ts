import type * as babelParser from '@babel/parser'
import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild'
import type * as swcCore from '@swc/core'
import type { Visitor as swcVisitor } from '@swc/core/Visitor'
import * as fs from 'fs'
import * as path from 'path'
import WindiCss from 'windicss'
import { StyleSheet } from 'windicss/utils/style'

interface EsbuildPipeableTransformArgs {
  readonly args: OnLoadArgs
  readonly contents: string
}

interface EsbuildPipeablePlugin extends Plugin {
  setup(build: PluginBuild, pipe: { transform: EsbuildPipeableTransformArgs }): OnLoadResult
  setup(build: PluginBuild): void
}

interface EsbuildPluginWindiCssOptions {
  readonly filter?: RegExp
  readonly parser?: 'babel' | 'swc'
  readonly babelParserOptions?: babelParser.ParserOptions
  readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0]
}

interface EsbuildPluginWindiCss {
  (options?: EsbuildPluginWindiCssOptions): EsbuildPipeablePlugin
  default: EsbuildPluginWindiCss
}

const pluginName = 'esbuild-plugin-windicss'

const ignoredClassPattern = RegExp(`\\b(${Object.getOwnPropertyNames(Object.prototype).join('|')})\\b`, 'g')

const plugin: EsbuildPluginWindiCss = ({ filter, parser, babelParserOptions, windiCssConfig } = {}) => {
  let windiCss = new WindiCss(windiCssConfig)
  const collectStylesFromString = (styleSheet: StyleSheet, className: string) => {
    const interpreted = windiCss.interpret(className.replace(ignoredClassPattern, ' ').trim(), true)
    if (interpreted.success.length !== 0) {
      styleSheet.extend(interpreted.styleSheet)
    }
  }

  const collectStylesFromTransformArgs = ((): ({ args, contents }: EsbuildPipeableTransformArgs, styleSheet: StyleSheet) => void => {
    if (parser === 'swc') {
      const swc: typeof swcCore = require('@swc/core')
      class StringLiteralCollector extends (require('@swc/core/Visitor').Visitor as { new(): swcVisitor }) {
        constructor(private readonly styleSheet: StyleSheet) {
          super()
        }
        override visitStringLiteral(token: swcCore.StringLiteral) {
          collectStylesFromString(this.styleSheet, token.value)
          return super.visitStringLiteral(token)
        }
        override visitTemplateLiteral(token: swcCore.TemplateLiteral) {
          for (const { raw } of token.quasis) {
            collectStylesFromString(this.styleSheet, raw.value)
          }
          return super.visitTemplateLiteral(token)
        }
        override visitTsType(token: swcCore.TsType) {
          return token
        }
      }
      return ({ args, contents }, styleSheet) => {
        const ts = /\.tsx?$/.test(args.path)
        const options: Parameters<typeof swcCore.parseSync>[1] = ts ? { syntax: 'typescript', tsx: args.path.endsWith('x') } : { syntax: 'ecmascript', jsx: args.path.endsWith('x') }
        new StringLiteralCollector(styleSheet).visitModule(swc.parseSync(contents, options))
      }
    } else {
      const babel: typeof babelParser = require('@babel/parser')
      const resolvedBabelParserOptions: babelParser.ParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
        errorRecovery: true,
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        tokens: true,
        plugins: ['jsx', 'typescript', 'topLevelAwait'],
      }
      return ({ contents }, styleSheet) => {
        for (const token of babel.parse(contents, resolvedBabelParserOptions).tokens!) {
          if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
            collectStylesFromString(styleSheet, token.value)
          }
        }
      }
    }
  })()

  let firstFilePath: string | undefined
  const cssFileContentsMap = new Map<string, string>()
  const transform = (args: EsbuildPipeableTransformArgs) => {
    // recreate WindiCss instance for each build
    if (firstFilePath === undefined) {
      firstFilePath = args.args.path
    } else if (firstFilePath === args.args.path) {
      windiCss = new WindiCss(windiCssConfig)
    }

    const styleSheet = new StyleSheet()
    collectStylesFromTransformArgs(args, styleSheet)
    let contents: string
    if (styleSheet.children.length !== 0) {
      const cssFilename = `${args.args.path}.${pluginName}.css`
      cssFileContentsMap.set(cssFilename, styleSheet.combine().sort().build(true))
      contents = `import '${cssFilename}'\n${args.contents}`
    } else {
      contents = args.contents
    }
    return { contents, loader: path.extname(args.args.path).slice(1) as 'js' | 'jsx' | 'ts' | 'tsx' }
  }

  return {
    name: pluginName,
    setup: ((build: PluginBuild, pipe?: { transform: EsbuildPipeableTransformArgs }) => {
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
    }) as EsbuildPipeablePlugin['setup'],
  }
}

export = plugin.default = plugin
