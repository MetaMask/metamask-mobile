import { isENS } from './address';

describe('isENS', () => {
	it('should return false by default', () => {
		expect(isENS()).toBe(false);
	});
	it('should return false for normal domain', () => {
		expect(isENS('ricky.codes')).toBe(false);
	});
	it('should return true for ens', () => {
		expect(isENS('rickycodes.eth')).toBe(true);
	});
});
