import { parseWaitTime, getGasLimit } from '.';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine');

const ENGINE_MOCK = Engine as jest.MockedClass<any>;

ENGINE_MOCK.context = {
  TransactionController: {
    estimateGas: jest.fn().mockImplementation(({ gas }) => {
      if (gas === undefined) return Promise.resolve({ gas: '0x5208' });
      return Promise.resolve({ gas });
    }),
  },
};

describe('CustomGas utils :: parseWaitTime', () => {
  it('parseWaitTime', () => {
    expect(parseWaitTime(23.86)).toEqual('23min');
    expect(parseWaitTime(2774 / 60)).toEqual('46min');
    expect(parseWaitTime(3044 / 60)).toEqual('50min');
    expect(parseWaitTime(5822 / 60)).toEqual('1hr 37min');
    expect(parseWaitTime(3662 / 60)).toEqual('1hr 1min');
    expect(parseWaitTime(2887 / 60)).toEqual('48min');
    expect(parseWaitTime(128 / 60)).toEqual('2min');
    expect(parseWaitTime(5279 / 60)).toEqual('1hr 27min');
    expect(parseWaitTime(5111 / 60)).toEqual('1hr 25min');
    expect(parseWaitTime(3480 / 60)).toEqual('58min');
    expect(parseWaitTime(5820 / 60)).toEqual('1hr 37min');
    expect(parseWaitTime(549 / 60)).toEqual('9min');
    expect(parseWaitTime(10080)).toEqual('1week');
    expect(parseWaitTime(11520)).toEqual('1week 1day');
    expect(parseWaitTime(11530)).toEqual('1week 1day');
    expect(parseWaitTime(15840)).toEqual('1week 4day');
    expect(parseWaitTime(15940)).toEqual('1week 4day');
    expect(parseWaitTime(38980)).toEqual('3week 6day');
    expect(parseWaitTime(1440)).toEqual('1day');
    expect(parseWaitTime(1460)).toEqual('1day 20min');
    expect(parseWaitTime(1500)).toEqual('1day 1hr');
    expect(parseWaitTime(3360)).toEqual('2day 8hr');
  });
});

describe('CustomGas Util:: GetGasLimit', () => {
  it('should return passed gas value', async () => {
    const estimate = await getGasLimit({ gas: '0x9fd2', gasPrice: '12' });
    expect(estimate.gas.toNumber()).toEqual(40914);
  });

  it('should fetch new estimated gas value', async () => {
    const estimate = await getGasLimit({ gas: '0x9fd2', gasPrice: '12' }, true);
    expect(estimate.gas.toNumber()).toEqual(21000);
  });
});
