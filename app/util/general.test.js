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
	it('should coerce a string toLowerCase', () => {
		expect(tlc('aBCDefH')).toEqual('abcdefh');
		expect(tlc(NaN)).toEqual('nan');
	});
});

describe('toLowerCaseCompare', () => {
	it('compare two things', () => {
		expect(toLowerCaseCompare('A', 'A')).toEqual(true);
		expect(toLowerCaseCompare('A', 'B')).toEqual(false);
	});
});
