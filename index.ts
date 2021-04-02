import { parse, ParserOptions } from '@babel/parser'
import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import WindiCss from 'windicss'

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

const plugin: EsbuildPluginWindiCss = ({ filter, babelParserOptions, windiCssConfig } = {}) => {
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
  const transform = ({ args, contents }: EsbuildPipeableTransformArgs) => {
    const classNames = new Set<string>()
    for (const token of parse(contents, resolvedBabelParserOptions).tokens!) {
      if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
        classNames.add(token.value)
      }
    }
    const result = windiCss.interpret([...classNames].join(' '), true)
    if (result.success.length !== 0) {
      const cssFilename = `${args.path}.${pluginName}.css`
      cssFileContentsMap.set(cssFilename, result.styleSheet.build())
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
