export const stripQuotes = (str) => {
    let result = str;
    while ((result.startsWith('"') && result.endsWith('"')) ||
        (result.startsWith("'") && result.endsWith("'"))) {
        result = result.slice(1, -1);
    }
    return result;
};
export const parseCommaSeparatedString = (value) => value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
//# sourceMappingURL=stringParseUtils.mjs.map