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
const windicss_1 = __importDefault(require("windicss"));
const parser_1 = require("@babel/parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const name = 'esbuild-plugin-windicss';
const plugin = ({ filter, preprocess, babelParserOptions, windiCssConfig } = {}) => ({
    name,
    setup(build) {
        const resolvedBabelParserOptions = babelParserOptions ? { ...babelParserOptions, tokens: true } : {
            errorRecovery: true,
            allowAwaitOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
            allowUndeclaredExports: true,
            tokens: true,
            plugins: ['jsx', 'typescript'],
        };
        const windiCss = new windicss_1.default(windiCssConfig);
        const cssFileContentsMap = new Map();
        build.onLoad({ filter: filter ?? /\.[jt]sx?$/ }, async (args) => {
            let code = await fs.promises.readFile(args.path, 'utf8');
            code = preprocess ? preprocess(code, args) : code;
            try {
                const classNames = new Set();
                for (const token of parser_1.parse(code, resolvedBabelParserOptions).tokens) {
                    if (token.value && (token.type.label === 'string' || token.type.label === 'template')) {
                        classNames.add(token.value);
                    }
                }
                const result = windiCss.interpret([...classNames].join(' '), true);
                if (result.success.length !== 0) {
                    const cssFilename = `${args.path}.${name}.css`;
                    cssFileContentsMap.set(cssFilename, result.styleSheet.build());
                    code = `import '${cssFilename}'\n${code}`;
                }
                return { contents: code, loader: path.extname(args.path).slice(1) };
            }
            catch (error) {
                return { errors: [{ text: error.message }] };
            }
        });
        build.onResolve({ filter: RegExp(String.raw `\.${name}\.css`) }, ({ path }) => ({ path, namespace: name }));
        build.onLoad({ filter: RegExp(String.raw `\.${name}\.css`), namespace: name }, ({ path }) => {
            const contents = cssFileContentsMap.get(path);
            return contents ? { contents, loader: 'css' } : undefined;
        });
    },
});
module.exports = plugin.default = plugin;