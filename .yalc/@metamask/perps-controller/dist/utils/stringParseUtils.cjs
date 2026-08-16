"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommaSeparatedString = exports.stripQuotes = void 0;
const stripQuotes = (str) => {
    let result = str;
    while ((result.startsWith('"') && result.endsWith('"')) ||
        (result.startsWith("'") && result.endsWith("'"))) {
        result = result.slice(1, -1);
    }
    return result;
};
exports.stripQuotes = stripQuotes;
const parseCommaSeparatedString = (value) => value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
exports.parseCommaSeparatedString = parseCommaSeparatedString;
//# sourceMappingURL=stringParseUtils.cjs.map