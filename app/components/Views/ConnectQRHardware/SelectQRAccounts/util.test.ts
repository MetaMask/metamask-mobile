import utils from './util';

describe('ConnectQRHardware.SelectQRAccounts.util', () => {
	describe('clipAddress', () => {
		const address = '0x0123456789abcdef';
		it('should clip address when necessary', () => {
			expect(utils.clipAddress(address, 3, 5)).toBe('0x0...bcdef');
		});
		it('should not clip address if address is too short', () => {
			expect(utils.clipAddress(address, 16, 16)).toBe(address);
		});
	});
});
