const svgTransformer = require("react-native-svg-transformer");
const defaultTransformer = require("metro-react-native-babel-transformer");
const path = require("path");
const { removeFencedCode, lintTransformedFile } = require("./remove-fenced-code");

const LINT_FENCED_FILES = false;

module.exports.transform = async ({ src, filename, options }) => {
    if (filename.endsWith(".svg")) {
        return svgTransformer.transform({ src, filename, options });
    }

    if (['.js', '.cjs', '.mjs', '.ts'].includes(path.extname(filename))) {
        // TODO: Actual build types
        const [processedSource, didModify] = removeFencedCode(filename, { all: new Set(['flask', 'snaps']), active: new Set([]) }, src);
        if (LINT_FENCED_FILES && didModify) {
            await lintTransformedFile(fileContent, filename)
        }
        return defaultTransformer.transform({ src: processedSource, filename, options });
    }
    return defaultTransformer.transform({ src, filename, options });
};
