import { parseWaitTime } from './custom-gas';

describe('CustomGas utils :: parseWaitTime', () => {
	it('parseWaitTime', () => {
		expect(parseWaitTime(23.86, 'hr', 'min', 'sec')).toEqual('23min 52sec');
		expect(parseWaitTime(2774 / 60, 'hr', 'min', 'sec')).toEqual('46min 14sec');
		expect(parseWaitTime(3044 / 60, 'hr', 'min', 'sec')).toEqual('50min 44sec');
		expect(parseWaitTime(5822 / 60, 'hr', 'min', 'sec')).toEqual('1hr 37min');
		expect(parseWaitTime(3662 / 60, 'hr', 'min', 'sec')).toEqual('1hr 1min');
		expect(parseWaitTime(2887 / 60, 'hr', 'min', 'sec')).toEqual('48min 8sec');
		expect(parseWaitTime(128 / 60, 'hr', 'min', 'sec')).toEqual('2min 8sec');
		expect(parseWaitTime(5279 / 60, 'hr', 'min', 'sec')).toEqual('1hr 27min');
		expect(parseWaitTime(5111 / 60, 'hr', 'min', 'sec')).toEqual('1hr 25min');
		expect(parseWaitTime(3480 / 60, 'hr', 'min', 'sec')).toEqual('58min');
		expect(parseWaitTime(5820 / 60, 'hr', 'min', 'sec')).toEqual('1hr 37min');
		expect(parseWaitTime(549 / 60, 'hr', 'min', 'sec')).toEqual('9min 9sec');
	});
});
