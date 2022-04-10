import { capitalize, tlc, toLowerCaseEquals, renderShortText, versionGreaterOrEqualThan } from '.';

describe('capitalize', () => {
	const my_string = 'string';
	it('should capitalize a string', () => {
		expect(capitalize(my_string)).toEqual('String');
	});
	it('should return false if a string is not provided', () => {
		expect(capitalize(null)).toEqual(false);
	});
});

describe('tlc', () => {
	const o = {};
	it('should coerce a string toLowerCase', () => {
		expect(tlc('aBCDefH')).toEqual('abcdefh');
		expect(tlc(NaN)).toEqual(undefined);
		expect(tlc(o.p)).toEqual(undefined);
	});
});

describe('toLowerCaseEquals', () => {
	const o = {};
	it('compares two things', () => {
		expect(toLowerCaseEquals('A', 'A')).toEqual(true);
		expect(toLowerCaseEquals('aBCDefH', 'abcdefh')).toEqual(true);
		expect(toLowerCaseEquals('A', 'B')).toEqual(false);
		expect(toLowerCaseEquals('aBCDefH', 'abcdefi')).toEqual(false);
		// cases where a or b are undefined
		expect(toLowerCaseEquals(o.p, 'A')).toEqual(false);
		expect(toLowerCaseEquals('A', o.p)).toEqual(false);
		expect(toLowerCaseEquals(undefined, 'A')).toEqual(false);
		expect(toLowerCaseEquals('A', undefined)).toEqual(false);
		// case where a and b are both undefined, null or false
		expect(toLowerCaseEquals(undefined, undefined)).toEqual(false);
		expect(toLowerCaseEquals(null, null)).toEqual(false);
		expect(toLowerCaseEquals(false, false)).toEqual(false);
	});
});

describe('renderShortText', () => {
	it('should return a shorter version of the text', () => {
		const input = '123456789';
		const expectedOutput = '123...9';
		expect(renderShortText(input, 1)).toStrictEqual(expectedOutput);
	});

	it('should return the same text if the shorter version has the same length or bigger', () => {
		const input = '123456789';
		expect(renderShortText(input, 2)).toStrictEqual(input);
	});
});

describe('versionGreaterOrEqualThan', () => {
	const mockVersionOne = '99.0.4844.88';
	const mockVersionTwo = '100.0.4896.79';
	const mockVersionThree = '83.0.4103.106';

	it('should be false if vOne is lower than vTwo', () => {
		expect(versionGreaterOrEqualThan(mockVersionOne, mockVersionTwo)).toBe(false);
	});
	it('should be true if vOne is greater than vTwo', () => {
		expect(versionGreaterOrEqualThan(mockVersionOne, mockVersionThree)).toBe(true);
	});
	it('should be true if vOne is equal than vTwo', () => {
		expect(versionGreaterOrEqualThan(mockVersionOne, mockVersionOne)).toBe(true);
	});
});
