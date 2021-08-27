import { isENS } from '.';

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
	it('should return true for eth ens', () => {
		expect(isENS('ricky.eth.eth')).toBe(true);
	});
	it('should return true for metamask ens', () => {
		expect(isENS('ricky.metamask.eth')).toBe(true);
	});
});
