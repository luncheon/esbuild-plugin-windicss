import type { OnLoadArgs, OnLoadResult, Plugin, PluginBuild } from 'esbuild';
import type * as babelParser from '@babel/parser';
import WindiCss from 'windicss';
interface EsbuildPipeableTransformArgs {
    readonly args: OnLoadArgs;
    readonly contents: string;
}
interface EsbuildPipeablePlugin extends Plugin {
    setup(build: PluginBuild, pipe: {
        transform: EsbuildPipeableTransformArgs;
    }): OnLoadResult;
    setup(build: PluginBuild): void;
}
interface EsbuildPluginWindiCssOptions {
    readonly filter?: RegExp;
    readonly parser?: 'babel' | 'sucrase' | 'swc';
    readonly babelParserOptions?: babelParser.ParserOptions;
    readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0];
}
interface EsbuildPluginWindiCss {
    (options?: EsbuildPluginWindiCssOptions): EsbuildPipeablePlugin;
    default: EsbuildPluginWindiCss;
}
declare const _default: EsbuildPluginWindiCss;
export = _default;
