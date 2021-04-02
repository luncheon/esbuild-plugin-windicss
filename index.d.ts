import { ParserOptions } from '@babel/parser';
import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild';
import WindiCss from 'windicss';
interface EsbuildPipeableTransformArgs {
    readonly args: OnLoadArgs;
    readonly contents: string;
}
interface EsbuildPipeablePlugin extends Plugin {
    setup: (build: PluginBuild, pipe?: {
        transform: EsbuildPipeableTransformArgs;
    }) => void | OnLoadResult;
}
interface EsbuildPluginWindiCssOptions {
    readonly filter?: RegExp;
    readonly babelParserOptions?: ParserOptions;
    readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0];
}
interface EsbuildPluginWindiCss {
    (options?: EsbuildPluginWindiCssOptions): EsbuildPipeablePlugin;
    default: EsbuildPluginWindiCss;
}
declare const _default: EsbuildPluginWindiCss;
export = _default;
