import { capitalize, tlc, toLowerCaseCompare } from './general';

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

describe('toLowerCaseCompare', () => {
	const o = {};
	it('compares two things', () => {
		expect(toLowerCaseCompare('A', 'A')).toEqual(true);
		expect(toLowerCaseCompare('aBCDefH', 'abcdefh')).toEqual(true);
		expect(toLowerCaseCompare('A', 'B')).toEqual(false);
		expect(toLowerCaseCompare('aBCDefH', 'abcdefi')).toEqual(false);
		// cases where a or b are undefined
		expect(toLowerCaseCompare(o.p, 'A')).toEqual(false);
		expect(toLowerCaseCompare('A', o.p)).toEqual(false);
		expect(toLowerCaseCompare(undefined, 'A')).toEqual(false);
		expect(toLowerCaseCompare('A', undefined)).toEqual(false);
	});
});
