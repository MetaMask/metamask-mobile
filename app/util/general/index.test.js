import { capitalize, tlc, toLowerCaseEquals } from '.';

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
