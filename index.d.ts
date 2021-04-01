import WindiCss from 'windicss';
import { ParserOptions } from '@babel/parser';
import type { Plugin, OnLoadArgs } from 'esbuild';
interface EsbuildPluginWindiCssOptions {
    readonly filter?: RegExp;
    readonly preprocess?: (code: string, args: OnLoadArgs) => string;
    readonly babelParserOptions?: ParserOptions;
    readonly windiCssConfig?: ConstructorParameters<typeof WindiCss>[0];
}
interface EsbuildPluginWindiCss {
    (options?: EsbuildPluginWindiCssOptions): Plugin;
    default: EsbuildPluginWindiCss;
}
declare const _default: EsbuildPluginWindiCss;
export = _default;
