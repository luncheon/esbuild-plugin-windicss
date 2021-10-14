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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const windicss_1 = __importDefault(require("windicss"));
const style_1 = require("windicss/utils/style");
const pluginName = 'esbuild-plugin-windicss';
const ignoredClassPattern = RegExp(`\\b(${Object.getOwnPropertyNames(Object.prototype).join('|')})\\b`, 'g');
const plugin = ({ filter, parser, babelParserOptions, windiCssConfig } = {}) => {
    let windiCss = new windicss_1.default(windiCssConfig);
    const collectStylesFromString = (styleSheet, className) => {
        const interpreted = windiCss.interpret(className.replace(ignoredClassPattern, ' ').trim(), true);
        if (interpreted.success.length !== 0) {
            styleSheet.extend(interpreted.styleSheet);
        }
    };
    const collectStylesFromTransformArgs = (() => {
        if (parser === 'swc') {
            const swc = require('@swc/core');
            const { Visitor } = require('@swc/core/Visitor');
            class StringLiteralCollector extends Visitor {
                constructor(styleSheet) {
                    super();
                    this.styleSheet = styleSheet;
                }
                visitStringLiteral(token) {
                    collectStylesFromString(this.styleSheet, token.value);
                    return super.visitStringLiteral(token);
                }
                visitTemplateLiteral(token) {
                    for (const { raw } of token.quasis) {
                        collectStylesFromString(this.styleSheet, raw.value);
                    }
                    return super.visitTemplateLiteral(token);
                }
                visitTsType(token) {
                    return token;
                }
            }
            return ({ args, contents }, styleSheet) => {
                const ts = /\.tsx?$/.test(args.path);
                const options = ts ? { syntax: 'typescript', tsx: args.path.endsWith('x') } : { syntax: 'ecmascript', jsx: args.path.endsWith('x') };
                new StringLiteralCollector(styleSheet).visitModule(swc.parseSync(contents, options));
            };
        }
        else if (parser === 'sucrase') {
            const parser = require('sucrase/dist/parser');
            const { TokenType } = require('sucrase/dist/parser/tokenizer/types');
            return ({ args, contents }, styleSheet) => {
                for (const token of parser.parse(contents, args.path.endsWith('x'), /\.tsx?$/.test(args.path), false).tokens) {
                    if (token.type === TokenType.string) {
                        // see TokenProcessor.prototype.stringValueForToken()
                        collectStylesFromString(styleSheet, contents.slice(token.start + 1, token.end - 1));
                    }
                    else if (token.type === TokenType.template) {
                        collectStylesFromString(styleSheet, contents.slice(token.start, token.end));
                    }
                }
            };
        }
        else {
            const babel = require('@babel/parser');
            const resolvedBabelParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
                errorRecovery: true,
                allowAwaitOutsideFunction: true,
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true,
                allowSuperOutsideMethod: true,
                allowUndeclaredExports: true,
                tokens: true,
                plugins: ['jsx', 'typescript', 'topLevelAwait'],
            };
            return ({ contents }, styleSheet) => {
                for (const token of babel.parse(contents, resolvedBabelParserOptions).tokens) {
                    if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
                        collectStylesFromString(styleSheet, token.value);
                    }
                }
            };
        }
    })();
    let firstFilePath;
    const cssFileContentsMap = new Map();
    const transform = (args) => {
        // recreate WindiCss instance for each build
        if (firstFilePath === undefined) {
            firstFilePath = args.args.path;
        }
        else if (firstFilePath === args.args.path) {
            windiCss = new windicss_1.default(windiCssConfig);
        }
        const styleSheet = new style_1.StyleSheet();
        collectStylesFromTransformArgs(args, styleSheet);
        let contents;
        if (styleSheet.children.length !== 0) {
            const cssFilename = `${args.args.path}.${pluginName}.css`;
            cssFileContentsMap.set(cssFilename, styleSheet.combine().sort().build(true));
            contents = `import '${cssFilename}'\n${args.contents}`;
        }
        else {
            contents = args.contents;
        }
        return { contents, loader: path.extname(args.args.path).slice(1) };
    };
    return {
        name: pluginName,
        setup: ((build, pipe) => {
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
        }),
    };
};
module.exports = plugin.default = plugin;
