"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const parser_1 = require("@babel/parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const windicss_1 = __importDefault(require("windicss"));
const style_1 = require("windicss/utils/style");
const pluginName = 'esbuild-plugin-windicss';
const ignoredClassPattern = RegExp(`\\b(${Object.getOwnPropertyNames(Object.prototype).join('|')})\\b`, 'g');
const plugin = ({ filter, babelParserOptions, windiCssConfig } = {}) => {
    const resolvedBabelParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
        errorRecovery: true,
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        tokens: true,
        plugins: ['jsx', 'typescript', 'classProperties'],
    };
    const windiCss = new windicss_1.default(windiCssConfig);
    const cssFileContentsMap = new Map();
    const transform = ({ args, contents }) => {
        const styleSheet = new style_1.StyleSheet();
        for (const token of parser_1.parse(contents, resolvedBabelParserOptions).tokens) {
            if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
                const interpreted = windiCss.interpret(token.value.replace(ignoredClassPattern, ' ').trim(), true);
                if (interpreted.success.length !== 0) {
                    styleSheet.extend(interpreted.styleSheet);
                }
            }
        }
        if (styleSheet.children.length !== 0) {
            const cssFilename = `${args.path}.${pluginName}.css`;
            cssFileContentsMap.set(cssFilename, styleSheet.combine().sort().build(true));
            contents = `import '${cssFilename}'\n${contents}`;
        }
        return { contents, loader: path.extname(args.path).slice(1) };
    };
    return {
        name: pluginName,
        setup(build, pipe) {
            if (pipe?.transform) {
                return transform(pipe.transform);
            }
            build.onLoad({ filter: filter ?? /\.[jt]sx?$/ }, async (args) => {
                try {
                    return transform({ args, contents: await fs.promises.readFile(args.path, 'utf8') });
                }
                catch (error) {
                    return { errors: [{ text: error.message }] };
                }
            });
            build.onResolve({ filter: RegExp(String.raw `\.${pluginName}\.css`) }, ({ path }) => ({ path, namespace: pluginName }));
            build.onLoad({ filter: RegExp(String.raw `\.${pluginName}\.css`), namespace: pluginName }, ({ path }) => {
                const contents = cssFileContentsMap.get(path);
                return contents ? { contents, loader: 'css' } : undefined;
            });
        },
    };
};
module.exports = plugin.default = plugin;
