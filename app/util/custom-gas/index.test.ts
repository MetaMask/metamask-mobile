import { parseWaitTime } from '.';

describe('CustomGas utils :: parseWaitTime', () => {
  it('parseWaitTime', () => {
    expect(parseWaitTime(23.86, 'hr', 'min', 'sec')).toEqual('23min');
    expect(parseWaitTime(2774 / 60, 'hr', 'min', 'sec')).toEqual('46min');
    expect(parseWaitTime(3044 / 60, 'hr', 'min', 'sec')).toEqual('50min');
    expect(parseWaitTime(5822 / 60, 'hr', 'min', 'sec')).toEqual('1hr 37min');
    expect(parseWaitTime(3662 / 60, 'hr', 'min', 'sec')).toEqual('1hr 1min');
    expect(parseWaitTime(2887 / 60, 'hr', 'min', 'sec')).toEqual('48min');
    expect(parseWaitTime(128 / 60, 'hr', 'min', 'sec')).toEqual('2min');
    expect(parseWaitTime(5279 / 60, 'hr', 'min', 'sec')).toEqual('1hr 27min');
    expect(parseWaitTime(5111 / 60, 'hr', 'min', 'sec')).toEqual('1hr 25min');
    expect(parseWaitTime(3480 / 60, 'hr', 'min', 'sec')).toEqual('58min');
    expect(parseWaitTime(5820 / 60, 'hr', 'min', 'sec')).toEqual('1hr 37min');
    expect(parseWaitTime(549 / 60, 'hr', 'min', 'sec')).toEqual('9min');
    expect(parseWaitTime(10080, 'hr', 'min', 'sec')).toEqual('1week');
    expect(parseWaitTime(11520, 'hr', 'min', 'sec')).toEqual('1week 1day');
    expect(parseWaitTime(11530, 'hr', 'min', 'sec')).toEqual('1week 1day');
    expect(parseWaitTime(15840, 'hr', 'min', 'sec')).toEqual('1week 4day');
    expect(parseWaitTime(15940, 'hr', 'min', 'sec')).toEqual('1week 4day');
    expect(parseWaitTime(38980, 'hr', 'min', 'sec')).toEqual('3week 6day');
    expect(parseWaitTime(1440, 'hr', 'min', 'sec')).toEqual('1day');
    expect(parseWaitTime(1460, 'hr', 'min', 'sec')).toEqual('1day 20min');
    expect(parseWaitTime(1500, 'hr', 'min', 'sec')).toEqual('1day 1hr');
    expect(parseWaitTime(3360, 'hr', 'min', 'sec')).toEqual('2day 8hr');
  });
});
