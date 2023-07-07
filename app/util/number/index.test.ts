import { BN } from 'ethereumjs-util';

import {
  addCurrencySymbol,
  balanceToFiat,
  balanceToFiatNumber,
  BNToHex,
  calcTokenValueToSend,
  calculateEthFeeForMultiLayer,
  dotAndCommaDecimalFormatter,
  fastSplit,
  fiatNumberToTokenMinimalUnit,
  fiatNumberToWei,
  formatValueToMatchTokenDecimals,
  fromTokenMinimalUnit,
  fromTokenMinimalUnitString,
  fromWei,
  handleWeiNumber,
  hexToBN,
  isBN,
  isDecimal,
  isNumber,
  isNumberScientificNotationWhenString,
  isZeroValue,
  limitToMaximumDecimalPlaces,
  renderFiat,
  renderFromTokenMinimalUnit,
  renderFromWei,
  safeNumberToBN,
  toBN,
  toHexadecimal,
  toTokenMinimalUnit,
  toWei,
  weiToFiat,
  weiToFiatNumber,
} from './';

describe('Number utils :: BNToHex', () => {
  it('BNToHex', () => {
    expect(BNToHex(new BN('1337'))).toEqual('0x539');
  });
});

describe('Number utils :: fromWei', () => {
  it('fromWei using number', () => {
    expect(fromWei(1337)).toEqual('0.000000000000001337');
  });

  it('fromWei using string', () => {
    expect(fromWei('1337')).toEqual('0.000000000000001337');
  });

  it('fromWei using BN number', () => {
    expect(fromWei(new BN('1337'))).toEqual('0.000000000000001337');
  });
});

describe('Number utils :: toWei', () => {
  it('toWei using number', () => {
    expect(toWei(1337).toString()).toEqual('1337000000000000000000');
    //wei representation of 0.000000000000001337 ether
    expect(toWei(1.337e-15).toString()).toEqual('1337');
    expect(toWei(0.000000000000001337).toString()).toEqual('1337');
    //wei representation of 1337000000000000000 ether
    expect(toWei(1.337e18).toString()).toEqual(
      '1337000000000000000000000000000000000',
    );
    expect(toWei(1337000000000000000).toString()).toEqual(
      '1337000000000000000000000000000000000',
    );
  });

  it('toWei using string', () => {
    expect(toWei('1337').toString()).toEqual('1337000000000000000000');
    //wei representation of 0.000000000000001337 ether
    expect(toWei('0.000000000000001337').toString()).toEqual('1337');
    //wei representation of 1337000000000000000 ether
    expect(toWei('1337000000000000000').toString()).toEqual(
      '1337000000000000000000000000000000000',
    );

    // expect errors when passing numbers as strings in scientific notation
    // since `ethjs-unit` doesn't support it
    expect(() => toWei('1.337e18')).toThrow(Error);
    expect(() => toWei('1.337e-15')).toThrow(Error);
  });

  // bn.js do not support decimals, so tests here only cover integers
  it('toWei using BN number', () => {
    expect(toWei(new BN(1337)).toString()).toEqual('1337000000000000000000');

    // Tests for expected limitations of BN.js

    // BN.js do not support decimals
    expect(toWei(new BN(1.337e-15)).toString()).toEqual('0');
    // BN.js do not support such big numbers
    expect(() => toWei(new BN(1.337e18))).toThrow(Error);
    expect(() => toWei(new BN(1337000000000000000))).toThrow(Error);
    // For some reason this returns 8338418000000000000000000 wei
    expect(toWei(new BN('1.337e18'))).not.toEqual(
      '1337000000000000000000000000000000000',
    );
  });
});

describe('Number utils :: fromTokenMinimalUnit', () => {
  it('fromTokenMinimalUnit using number', () => {
    expect(fromTokenMinimalUnit(1337, 6)).toEqual('0.001337');
    expect(fromTokenMinimalUnit(1337, 0)).toEqual('1337');
    expect(fromTokenMinimalUnit(1337, 18)).toEqual('0.000000000000001337');
  });

  it('fromTokenMinimalUnit using string', () => {
    expect(fromTokenMinimalUnit('1337', 6)).toEqual('0.001337');
    expect(fromTokenMinimalUnit('1337', 0)).toEqual('1337');
    expect(fromTokenMinimalUnit('1337', 18)).toEqual('0.000000000000001337');
  });

  it('fromTokenMinimalUnit using BN number', () => {
    expect(fromTokenMinimalUnit(new BN('1337'), 6)).toEqual('0.001337');
    expect(fromTokenMinimalUnit(new BN('1337'), 0)).toEqual('1337');
    expect(fromTokenMinimalUnit(new BN('1337'), 18)).toEqual(
      '0.000000000000001337',
    );
  });

  it('fromTokenMinimalUnit using exp number', () => {
    expect(fromTokenMinimalUnit(1e22, 6)).toEqual('10000000000000000');
    expect(fromTokenMinimalUnit(1e2, 6)).toEqual('0.0001');
    expect(fromTokenMinimalUnit(1e16, 6)).toEqual('10000000000');
    expect(fromTokenMinimalUnit(1e18, 18)).toEqual('1');
  });
});

describe('Number utils :: fromTokenMinimalUnitString', () => {
  it('fromTokenMinimalUnit using number', () => {
    expect(() => fromTokenMinimalUnitString(1337, 6)).toThrow();
    expect(() => fromTokenMinimalUnitString(1337, 0)).toThrow();
    expect(() => fromTokenMinimalUnitString(1337, 18)).toThrow();
  });

  it('fromTokenMinimalUnitString using string', () => {
    expect(fromTokenMinimalUnitString('1337', 6)).toEqual('0.001337');
    expect(fromTokenMinimalUnitString('1337', 0)).toEqual('1337');
    expect(fromTokenMinimalUnitString('1337', 18)).toEqual(
      '0.000000000000001337',
    );
    expect(fromTokenMinimalUnitString('1234560000000000000', 18)).toEqual(
      '1.23456',
    );
    expect(fromTokenMinimalUnitString('1000000000000000000', 18)).toEqual('1');
    expect(fromTokenMinimalUnitString('1', 18)).toEqual('0.000000000000000001');
    expect(fromTokenMinimalUnitString('0', 18)).toEqual('0');
    expect(fromTokenMinimalUnitString('123456789', 5)).toEqual('1234.56789');
    expect(
      fromTokenMinimalUnitString('1234567890000000000987654321', 18),
    ).toEqual('1234567890.000000000987654321');
    expect(
      fromTokenMinimalUnitString('10000000000000000000000000000001', 18),
    ).toEqual('10000000000000.000000000000000001');
    expect(
      fromTokenMinimalUnitString('10000000000000000000000000000000', 18),
    ).toEqual('10000000000000');
    expect(fromTokenMinimalUnitString('3900229504248293869', 18)).toEqual(
      '3.900229504248293869',
    );
    expect(
      fromTokenMinimalUnitString('92836465327282987373728723', 18),
    ).toEqual('92836465.327282987373728723');
    expect(fromTokenMinimalUnitString('6123512631253', 16)).toEqual(
      '0.0006123512631253',
    );
    expect(fromTokenMinimalUnitString('92836465327282987373728723', 0)).toEqual(
      '92836465327282987373728723',
    );
    expect(
      fromTokenMinimalUnitString(
        '9283646532728212312312312312312987373728723',
        32,
      ),
    ).toEqual('92836465327.28212312312312312312987373728723');
    expect(fromTokenMinimalUnitString('-1234560000000000000', 18)).toEqual(
      '-1.23456',
    );
    expect(fromTokenMinimalUnitString('-1000000000000000000', 18)).toEqual(
      '-1',
    );
    expect(fromTokenMinimalUnitString('-1', 18)).toEqual(
      '-0.000000000000000001',
    );
    expect(fromTokenMinimalUnitString('-0', 18)).toEqual('0');
    expect(fromTokenMinimalUnitString('-123456789', 5)).toEqual('-1234.56789');
    expect(
      fromTokenMinimalUnitString('-1234567890000000000987654321', 18),
    ).toEqual('-1234567890.000000000987654321');
    expect(
      fromTokenMinimalUnitString('-10000000000000000000000000000001', 18),
    ).toEqual('-10000000000000.000000000000000001');
    expect(
      fromTokenMinimalUnitString('-10000000000000000000000000000000', 18),
    ).toEqual('-10000000000000');
    expect(fromTokenMinimalUnitString('-3900229504248293869', 18)).toEqual(
      '-3.900229504248293869',
    );
    expect(
      fromTokenMinimalUnitString('-92836465327282987373728723', 18),
    ).toEqual('-92836465.327282987373728723');
    expect(fromTokenMinimalUnitString('-6123512631253', 16)).toEqual(
      '-0.0006123512631253',
    );
    expect(
      fromTokenMinimalUnitString('-92836465327282987373728723', 0),
    ).toEqual('-92836465327282987373728723');
    expect(
      fromTokenMinimalUnitString(
        '-9283646532728212312312312312312987373728723',
        32,
      ),
    ).toEqual('-92836465327.28212312312312312312987373728723');
  });

  it('fromTokenMinimalUnitString using BN number', () => {
    expect(fromTokenMinimalUnitString(new BN('1337').toString(10), 6)).toEqual(
      '0.001337',
    );
    expect(fromTokenMinimalUnitString(new BN('1337').toString(10), 0)).toEqual(
      '1337',
    );
    expect(fromTokenMinimalUnitString(new BN('1337').toString(10), 18)).toEqual(
      '0.000000000000001337',
    );
    expect(fromTokenMinimalUnitString(new BN('123456').toString(), 5)).toEqual(
      '1.23456',
    );
    expect(fromTokenMinimalUnitString(new BN('123456').toString(), 5)).toEqual(
      '1.23456',
    );
    expect(
      fromTokenMinimalUnitString(new BN('1234560000000000000').toString(), 18),
    ).toEqual('1.23456');
    expect(
      fromTokenMinimalUnitString(new BN('1000000000000000000').toString(), 18),
    ).toEqual('1');
    expect(fromTokenMinimalUnitString(new BN('1').toString(), 18)).toEqual(
      '0.000000000000000001',
    );
    expect(fromTokenMinimalUnitString(new BN('0').toString(), 18)).toEqual('0');
    expect(
      fromTokenMinimalUnitString(new BN('123456789').toString(), 5),
    ).toEqual('1234.56789');
    expect(
      fromTokenMinimalUnitString(
        new BN('1234567890000000000987654321').toString(),
        18,
      ),
    ).toEqual('1234567890.000000000987654321');
    expect(
      fromTokenMinimalUnitString(
        new BN('10000000000000000000000000000001').toString(),
        18,
      ),
    ).toEqual('10000000000000.000000000000000001');
    expect(
      fromTokenMinimalUnitString(
        new BN('10000000000000000000000000000000').toString(),
        18,
      ),
    ).toEqual('10000000000000');
    expect(
      fromTokenMinimalUnitString(new BN('3900229504248293869').toString(), 18),
    ).toEqual('3.900229504248293869');
    expect(
      fromTokenMinimalUnitString(
        new BN('92836465327282987373728723').toString(),
        18,
      ),
    ).toEqual('92836465.327282987373728723');
    expect(
      fromTokenMinimalUnitString(new BN('6123512631253').toString(), 16),
    ).toEqual('0.0006123512631253');
    expect(
      fromTokenMinimalUnitString(
        new BN('92836465327282987373728723').toString(),
        0,
      ),
    ).toEqual('92836465327282987373728723');
  });
});

describe('Number utils :: toTokenMinimalUnit', () => {
  it('toTokenMinimalUnit using number', () => {
    expect(toTokenMinimalUnit(1337, 6)).toEqual(new BN('1337000000', 10));
    expect(toTokenMinimalUnit(1337, 0)).toEqual(new BN('1337'));
    expect(toTokenMinimalUnit(1337.1, 1)).toEqual(new BN('13371'));
  });

  it('toTokenMinimalUnit using string', () => {
    expect(toTokenMinimalUnit('1337', 6)).toEqual(new BN('1337000000'));
    expect(toTokenMinimalUnit('1337', 0)).toEqual(new BN('1337'));
    expect(toTokenMinimalUnit('1337.1', 2)).toEqual(new BN('133710'));
  });

  it('toTokenMinimalUnit using BN number', () => {
    expect(toTokenMinimalUnit(new BN('1337'), 0)).toEqual(new BN('1337'));
    expect(toTokenMinimalUnit(new BN('1337'), 6)).toEqual(new BN('1337000000'));
  });

  it('toTokenMinimalUnit using invalid inputs', () => {
    expect(() => toTokenMinimalUnit('0.0.0', 0)).toThrow();
    expect(() => toTokenMinimalUnit('.', 0)).toThrow();
    expect(() => toTokenMinimalUnit('0.0001', 0)).toThrow();
  });
});

describe('Number utils :: renderFromTokenMinimalUnit', () => {
  it('renderFromTokenMinimalUnit using number', () => {
    expect(renderFromTokenMinimalUnit(1337, 6)).toEqual('0.00134');
    expect(renderFromTokenMinimalUnit(1337, 0)).toEqual('1337');
    expect(renderFromTokenMinimalUnit(1337, 10)).toEqual('< 0.00001');
    expect(renderFromTokenMinimalUnit(0, 10)).toEqual('0');
  });

  it('renderFromTokenMinimalUnit using string', () => {
    expect(renderFromTokenMinimalUnit('1337', 6)).toEqual('0.00134');
    expect(renderFromTokenMinimalUnit('1337', 0)).toEqual('1337');
    expect(renderFromTokenMinimalUnit('1337', 10)).toEqual('< 0.00001');
    expect(renderFromTokenMinimalUnit('0', 10)).toEqual('0');
  });

  it('renderFromTokenMinimalUnit using BN number', () => {
    expect(renderFromTokenMinimalUnit(new BN('1337'), 0)).toEqual('1337');
    expect(renderFromTokenMinimalUnit(new BN('1337'), 6)).toEqual('0.00134');
    expect(renderFromTokenMinimalUnit(new BN('1337'), 10)).toEqual('< 0.00001');
    expect(renderFromTokenMinimalUnit(new BN('0'), 10)).toEqual('0');
  });
});

describe('Number utils :: renderFromWei', () => {
  it('renderFromWei using number', () => {
    expect(renderFromWei(133700000000000000)).toEqual('0.1337');
    expect(renderFromWei(1337)).toEqual('< 0.00001');
    expect(renderFromWei(0)).toEqual('0');
  });

  it('renderFromWei using string', () => {
    expect(renderFromWei('133700000000000000')).toEqual('0.1337');
    expect(renderFromWei('1337')).toEqual('< 0.00001');
    expect(renderFromWei('0')).toEqual('0');
  });

  it('renderFromWei using BN number', () => {
    expect(renderFromWei(new BN('133700000000000000'))).toEqual('0.1337');
    expect(renderFromWei(new BN('1337'))).toEqual('< 0.00001');
    expect(renderFromWei(new BN('0'))).toEqual('0');
  });
});

describe('Number utils :: calcTokenValueToSend', () => {
  it('calcTokenValueToSend', () => {
    expect(calcTokenValueToSend(new BN(1337), 0)).toEqual('539');
    expect(calcTokenValueToSend(new BN(1337), 9)).toEqual('1374b68fa00');
    expect(calcTokenValueToSend(new BN(1337), 18)).toEqual(
      '487a9a304539440000',
    );
  });
});

describe('Number utils :: hexToBN', () => {
  it('hexToBN', () => {
    expect(hexToBN('0x539').toNumber()).toBe(1337);
  });
  it('should handle non string values', () => {
    const newBN = new BN(1);
    expect(hexToBN(newBN)).toBe(newBN);
  });
});

describe('Number utils :: isBN', () => {
  it('isBN', () => {
    expect(isBN('0x539')).toEqual(false);
    expect(isBN(new BN(1337))).toEqual(true);
  });
});

describe('Number utils :: isDecimal', () => {
  it('isDecimal', () => {
    expect(isDecimal('0.1')).toEqual(true);
    expect(isDecimal('0.0')).toEqual(true);
    expect(isDecimal('0.0000010001')).toEqual(true);
    expect(isDecimal('.0000010001')).toEqual(true);
    expect(isDecimal('1.0001')).toEqual(true);
    expect(isDecimal('1')).toEqual(true);
    expect(isDecimal('1-')).toEqual(false);
    expect(isDecimal('.1.')).toEqual(false);
    expect(isDecimal('..1')).toEqual(false);
  });
});

describe('Number utils :: weiToFiat', () => {
  it('weiToFiat', () => {
    const wei = toWei('1');
    expect(weiToFiat(wei, 1, 'usd')).toEqual('$1.00');
    expect(weiToFiat(wei, 0.5, 'usd')).toEqual('$0.50');
    expect(weiToFiat(wei, 0.1, 'usd')).toEqual('$0.10');
  });
});

describe('Number utils :: weiToFiatNumber', () => {
  it('weiToFiatNumber', () => {
    const wei = toWei('1');
    expect(weiToFiatNumber(wei, 0.1234512345)).toEqual(0.12345);
    expect(weiToFiatNumber(wei, 0.5)).toEqual(0.5);
    expect(weiToFiatNumber(wei, 0.111112)).toEqual(0.11111);
  });

  it('weiToFiatNumber decimals', () => {
    const wei = toWei('1');
    expect(weiToFiatNumber(wei, 0.1234512345, 1)).toEqual(0.1);
    expect(weiToFiatNumber(wei, 0.5, 2)).toEqual(0.5);
    expect(weiToFiatNumber(wei, 0.111112, 3)).toEqual(0.111);
  });
});

describe('Number utils :: handleWeiNumber', () => {
  it('weiToFiatNumber', () => {
    expect(handleWeiNumber('1.123')).toEqual('1.123');
    expect(handleWeiNumber('1')).toEqual('1');
    expect(handleWeiNumber('1.01')).toEqual('1.01');
    expect(handleWeiNumber('1.111111111111111111')).toEqual(
      '1.111111111111111111',
    );
    expect(handleWeiNumber('1.1111111111111111112222')).toEqual(
      '1.111111111111111111',
    );
  });
});

describe('Number utils :: fiatNumberToWei', () => {
  it('fiatNumberToWei', () => {
    const one = safeNumberToBN(Math.pow(10, 18));
    const ten = safeNumberToBN(Math.pow(10, 19));
    const decimal = safeNumberToBN(Math.pow(10, 17));
    const aThird = safeNumberToBN('4a03ce68d215534');
    expect(fiatNumberToWei('0.1234512345', 0.1234512345)).toEqual(one);
    expect(fiatNumberToWei('0.5', 0.5)).toEqual(one);
    expect(fiatNumberToWei('100', 10)).toEqual(ten);
    expect(fiatNumberToWei('1', 10)).toEqual(decimal);
    expect(fiatNumberToWei('1', 3)).toEqual(aThird);
  });
});

describe('Number utils :: fiatNumberToTokenMinimalUnit', () => {
  it('fiatNumberToTokenMinimalUnit', () => {
    const decimals = [18, 3, 12, 16, 4, 10];
    const conversionRates = [10, 8, 21, 18, 3, 8.11];
    const exchangeRates = [10, 1, 3, 3, 7, 2.17];
    const fiatValues = ['100', '123', '300', '1111.111', '9.999', '100'];
    let i = 0;

    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('1000000000000000000'));
    i = 1;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('15375'));
    i = 2;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('4761904761904'));
    i = 3;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('205761296296296300'));
    i = 4;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('4761'));
    i = 5;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBN('56822378925'));
  });
});

describe('Number utils :: balanceToFiat', () => {
  it('balanceToFiat', () => {
    expect(balanceToFiat(0.1, 0.1, 0.1, 'usd')).toEqual('$0.00');
    expect(balanceToFiat(0.0001, 0.1, 0.1, 'usd')).toEqual('$0.00');
  });
});

describe('Number utils :: addCurrencySymbol', () => {
  it('balanceToFiat', () => {
    expect(addCurrencySymbol(0.1, 'usd')).toEqual('$0.10');
    expect(addCurrencySymbol(0.0001, 'usd')).toEqual('$0.00');
    expect(addCurrencySymbol(0.0001, 'usd', true)).toEqual('$0.0001');
    expect(addCurrencySymbol(0.000101, 'usd', true)).toEqual('$0.000101');
  });
});

describe('Number utils :: balanceToFiatNumber', () => {
  it('balanceToFiatNumber', () => {
    expect(balanceToFiatNumber(0.1, 0.1, 0.1)).toEqual(0.001);
    expect(balanceToFiatNumber(0.0001, 0.1, 0.1)).toEqual(0);
  });
});

describe('Number utils :: renderFiat', () => {
  it('renderFiat', () => {
    expect(renderFiat(0.1, 'usd')).toEqual('$0.1');
    expect(renderFiat(0.0010000001, 'usd')).toEqual('$0.001');
  });
});

describe('toHexadecimal', () => {
  it('should convert to hexadecimal', () => {
    expect(toHexadecimal('001')).toEqual('1');
    expect(toHexadecimal('0x01')).toEqual('0x01');
    expect(toHexadecimal(2)).toEqual('2');
    expect(toHexadecimal()).toEqual(undefined);
    expect(toHexadecimal(1232)).toEqual('4d0');
    expect(
      toHexadecimal('123456789012345678901234567890123456789012345678'),
    ).toEqual('159ffe6f22fd5cc42c524df6fd5e28d0de38f34e');
  });
});

describe('Number utils :: fastSplit', () => {
  it('should split ', () => {
    expect(fastSplit('1650000007.7')).toEqual('1650000007');
    expect(fastSplit('1650000007')).toEqual('1650000007');
    expect(fastSplit('test string', ' ')).toEqual('test');
  });
});

describe('Number utils :: safeNumberToBN', () => {
  it('should safe convert a string type positive decimal number to BN', () => {
    const result: any = safeNumberToBN('1650000007.7');
    const expected: any = new BN('1650000007');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a number type positive decimal number to BN', () => {
    const result: any = safeNumberToBN(1650000007.7);
    const expected: any = new BN('1650000007');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a string type positive integer to BN', () => {
    const result: any = safeNumberToBN('16500');
    const expected: any = new BN('16500');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a number type positive integer to BN', () => {
    const result: any = safeNumberToBN(16500);
    const expected: any = new BN('16500');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a string type negative decimal number to BN', () => {
    const result: any = safeNumberToBN('-1650000007.7');
    const expected: any = new BN('-1650000007');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a number type negative decimal number to BN', () => {
    const result: any = safeNumberToBN(-1650000007.7);
    const expected: any = new BN('-1650000007');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a string type negative integer to BN', () => {
    const result: any = safeNumberToBN('-16500');
    const expected: any = new BN('-16500');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a number type negative integer to BN', () => {
    const result: any = safeNumberToBN(-16500);
    const expected: any = new BN('-16500');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a positive hex to BN', () => {
    const result: any = safeNumberToBN('75BCD15');
    const expected: any = new BN('123456789');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a positive hex with 0x prefix to BN', () => {
    const result: any = safeNumberToBN('0x75BCD15');
    const expected: any = new BN('123456789');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a negative hex to BN', () => {
    const result: any = safeNumberToBN('-75BCD15');
    const expected: any = new BN('-123456789');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a negative hex with 0x prefix to BN', () => {
    const result: any = safeNumberToBN('-0x75BCD15');
    const expected: any = new BN('-123456789');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a decimal zero to BN', () => {
    const result: any = safeNumberToBN('0');
    const expected: any = new BN('0');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a hex zero to BN', () => {
    const result: any = safeNumberToBN('0x0');
    const expected: any = new BN('0');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert an invalid hex string to zero', () => {
    const result: any = safeNumberToBN('0xNaN');
    const expected: any = new BN('0');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });

  it('should safe convert a NaN object', () => {
    const result: any = safeNumberToBN(NaN);
    const expected: any = new BN('0');
    expect(result.words[0]).toEqual(expected.words[0]);
    expect(result.words[1]).toEqual(expected.words[1]);
    expect(result.negative).toEqual(expected.negative);
    expect(result.length).toEqual(expected.length);
  });
});

describe('Number utils :: isNumber', () => {
  it('should be a valid number ', () => {
    expect(isNumber('1650.7')).toBe(true);
    expect(isNumber('1000')).toBe(true);
    expect(isNumber('0.0001')).toBe(true);
    expect(isNumber('0001')).toBe(true);
    expect(isNumber('1')).toBe(true);
  });

  it('should not be a valid number ', () => {
    expect(isNumber('..7')).toBe(false);
    expect(isNumber('1..1')).toBe(false);
    expect(isNumber('0..')).toBe(false);
    expect(isNumber('a.0001')).toBe(false);
    expect(isNumber('00a01')).toBe(false);
    expect(isNumber('1,.')).toBe(false);
    expect(isNumber('1,')).toBe(false);
    expect(isNumber('.')).toBe(false);
    expect(isNumber('a¡1')).toBe(false);
    expect(isNumber('.01')).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber(null)).toBe(false);
  });
});

describe('Number utils :: dotAndCommaDecimalFormatter', () => {
  it('should return the number if it does not contain a dot or comma', () => {
    expect(dotAndCommaDecimalFormatter('1650')).toBe('1650');
  });
  it('should return the number if it contains a dot', () => {
    expect(dotAndCommaDecimalFormatter('1650.7')).toBe('1650.7');
  });
  it('should replace the comma with a decimal with a comma if it contains a dot', () => {
    expect(dotAndCommaDecimalFormatter('1650,7')).toBe('1650.7');
  });
});

describe('Number utils :: isNumberScientificNotationWhenString', () => {
  it('isNumberScientificNotationWhenString passing number', () => {
    expect(isNumberScientificNotationWhenString(1.337e-6)).toEqual(false);
    expect(isNumberScientificNotationWhenString(1.337e-7)).toEqual(true);
    expect(isNumberScientificNotationWhenString(1.337e20)).toEqual(false);
    expect(isNumberScientificNotationWhenString(1.337e21)).toEqual(true);

    expect(isNumberScientificNotationWhenString(0.000001337)).toEqual(false);
    expect(isNumberScientificNotationWhenString(0.0000001337)).toEqual(true);
    expect(isNumberScientificNotationWhenString(133700000000000000000)).toEqual(
      false,
    );
    expect(
      isNumberScientificNotationWhenString(1337000000000000000000),
    ).toEqual(true);
  });

  it('isNumberScientificNotationWhenString should be false when non number is passed', () => {
    expect(isNumberScientificNotationWhenString('1.337e-6')).toEqual(false);
    expect(isNumberScientificNotationWhenString('1.337e-7')).toEqual(false);
    expect(isNumberScientificNotationWhenString('1.337e20')).toEqual(false);
    expect(isNumberScientificNotationWhenString('1.337e21')).toEqual(false);
  });
});

describe('Number utils :: calculateEthFeeForMultiLayer', () => {
  it('returns ethFee if multiLayerL1FeeTotal is falsy', () => {
    expect(
      calculateEthFeeForMultiLayer({
        multiLayerL1FeeTotal: undefined,
        ethFee: 0.000001,
      }),
    ).toBe(0.000001);
  });

  it('returns a new ETH fee which includes a multiLayerL1FeeTotal fee', () => {
    expect(
      calculateEthFeeForMultiLayer({
        multiLayerL1FeeTotal: 'ce37bdd0b8b8',
        ethFee: 0.000001,
      }),
    ).toBe('0.000227739');
  });
});

describe('Number utils :: limitToMaximumDecimalPlaces', () => {
  it('limits a num to a max decimal places (5)', () => {
    expect(limitToMaximumDecimalPlaces(0.001050172)).toBe('0.00105');
  });

  it('limits a num to 3 decimal places', () => {
    expect(limitToMaximumDecimalPlaces(0.001000172)).toBe('0.001');
  });

  it('does not add any decimal places for a whole number', () => {
    expect(limitToMaximumDecimalPlaces(5)).toBe('5');
  });
});

describe('Number utils :: isZeroValue', () => {
  it('returns true for 0', () => {
    expect(isZeroValue(0)).toBe(true);
  });
  it('returns true for hexadecimal string 0x0', () => {
    expect(isZeroValue('0x0')).toBe(true);
  });
  it('returns true for hexadecimal integer literal 0x0', () => {
    expect(isZeroValue(0x0)).toBe(true);
  });
  it('returns true for BN zero value', () => {
    expect(isZeroValue(toBN('0'))).toBe(true);
  });
});

describe('Number utils :: formatValueToMatchTokenDecimals', () => {
  it('should return a formatted value if the submitted decimals is 0', () => {
    expect(formatValueToMatchTokenDecimals('1.0', 0)).toBe('1');
  });
  it('should return the value if value is null', () => {
    expect(formatValueToMatchTokenDecimals(null, 18)).toBe(null);
  });
  it('should return the value if the decimal is undefined', () => {
    expect(formatValueToMatchTokenDecimals('1', undefined)).toBe('1');
  });
  it('should return a formatted value if the decimal is null', () => {
    expect(formatValueToMatchTokenDecimals('1', null)).toBe('1');
  });
  it('should return the value if the decimal is not a number', () => {
    expect(formatValueToMatchTokenDecimals('1', 'a')).toBe('1');
  });
  it('should return the value if the value decimal is equal to or less than the submitted decimal', () => {
    expect(formatValueToMatchTokenDecimals('1.2348', 4)).toBe('1.2348');
  });
  it('should return a formatted value if the value decimal is greater than the submitted decimal', () => {
    expect(formatValueToMatchTokenDecimals('1.234567', 4)).toBe('1.2346');
  });
});
