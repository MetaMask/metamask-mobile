import {
  addCurrencySymbol,
  addHexPrefix,
  balanceToFiat,
  balanceToFiatNumber,
  bigIntToHex,
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
  hexToBigInt,
  isBigInt,
  isDecimal,
  isNumber,
  isNumberValue,
  isNumberScientificNotationWhenString,
  isZeroValue,
  limitToMaximumDecimalPlaces,
  localizeLargeNumber,
  renderFiat,
  renderFromTokenMinimalUnit,
  renderFromWei,
  renderNumber,
  safeBigIntToHex,
  safeNumberToBigInt,
  toGwei,
  toHexadecimal,
  toTokenMinimalUnit,
  toWei,
  weiToFiat,
  weiToFiatNumber,
} from './bigint';

describe('Number utils :: bigIntToHex', () => {
  it('bigIntToHex', () => {
    expect(bigIntToHex(BigInt('1337'))).toEqual('0x539');
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
    expect(fromWei(BigInt('1337'))).toEqual('0.000000000000001337');
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

  // bnjs4 do not support decimals, so tests here only cover integers
  it('toWei using BN number', () => {
    expect(toWei(BigInt(1337)).toString()).toEqual('1337000000000000000000');

    // Tests for expected limitations of BN.js

    // BN.js do not support decimals
    expect(() => toWei(BigInt(1.337e-15)).toString()).toThrow(Error);
    // For some reason this returns 8338418000000000000000000 wei
    expect(toWei(BigInt(1.337e18))).not.toEqual(
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
    expect(fromTokenMinimalUnit(BigInt('1337'), 6)).toEqual('0.001337');
    expect(fromTokenMinimalUnit(BigInt('1337'), 0)).toEqual('1337');
    expect(fromTokenMinimalUnit(BigInt('1337'), 18)).toEqual(
      '0.000000000000001337',
    );
  });

  it('fromTokenMinimalUnit using exp number', () => {
    expect(fromTokenMinimalUnit(1e22, 6)).toEqual('10000000000000000');
    expect(fromTokenMinimalUnit(1e2, 6)).toEqual('0.0001');
    expect(fromTokenMinimalUnit(1e16, 6)).toEqual('10000000000');
    expect(fromTokenMinimalUnit(1e18, 18)).toEqual('1');
  });

  it('rounds number by default', () => {
    expect(fromTokenMinimalUnit(BigInt('1000000000000000000'), 18)).toEqual(
      '1',
    );
    expect(fromTokenMinimalUnit(BigInt('10000000000000000000'), 18)).toEqual(
      '10',
    );
    expect(fromTokenMinimalUnit(BigInt('100000000000000000000'), 18)).toEqual(
      '100',
    );
    expect(fromTokenMinimalUnit(BigInt('1000000000000000000000'), 18)).toEqual(
      '1000',
    );
    expect(fromTokenMinimalUnit(BigInt('10000000000000000000000'), 18)).toEqual(
      '10000',
    );

    // test decimal greater than 30,000
    expect(fromTokenMinimalUnit(BigInt('50000000000000000000000'), 18)).toEqual(
      '49999.999999999995805696',
    );

    // test decimal less than 1e-14
    expect(fromTokenMinimalUnit(hexToBigInt('576129d2d21d64a5'), 18)).toEqual(
      '6.296359739485676544',
    );
  });

  it('does not round number if isRounding is false', () => {
    expect(
      fromTokenMinimalUnit(BigInt('1000000000000000000'), 18, false),
    ).toEqual('1');
    expect(
      fromTokenMinimalUnit(BigInt('10000000000000000000'), 18, false),
    ).toEqual('10');
    expect(
      fromTokenMinimalUnit(BigInt('100000000000000000000'), 18, false),
    ).toEqual('100');
    expect(
      fromTokenMinimalUnit(BigInt('1000000000000000000000'), 18, false),
    ).toEqual('1000');
    expect(
      fromTokenMinimalUnit(BigInt('10000000000000000000000'), 18, false),
    ).toEqual('10000');

    // test decimal greater than 30,000
    expect(
      fromTokenMinimalUnit(BigInt('50000000000000000000000'), 18, false),
    ).toEqual('50000');

    // test decimal less than 1e-14
    expect(
      fromTokenMinimalUnit(hexToBigInt('576129d2d21d64a5'), 18, false),
    ).toEqual('6.296359739485676709');
  });

  it('correctly converts string input when isRounding is false', () => {
    expect(fromTokenMinimalUnit('1337', 6, false)).toEqual('0.001337');
    expect(fromTokenMinimalUnit('1337', 0, false)).toEqual('1337');
    expect(fromTokenMinimalUnit('1337', 18, false)).toEqual(
      '0.000000000000001337',
    );
    expect(fromTokenMinimalUnit('1000000000000000000', 18, false)).toEqual('1');
    expect(fromTokenMinimalUnit('1000000', 6, false)).toEqual('1');
  });
});

describe('Number utils :: fromTokenMinimalUnitString', () => {
  it('fromTokenMinimalUnit using number', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrongTypeInput = 1337 as any;
    expect(() => fromTokenMinimalUnitString(wrongTypeInput, 6)).toThrow();
    expect(() => fromTokenMinimalUnitString(wrongTypeInput, 0)).toThrow();
    expect(() => fromTokenMinimalUnitString(wrongTypeInput, 18)).toThrow();
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
    expect(fromTokenMinimalUnitString(BigInt('1337').toString(10), 6)).toEqual(
      '0.001337',
    );
    expect(fromTokenMinimalUnitString(BigInt('1337').toString(10), 0)).toEqual(
      '1337',
    );
    expect(fromTokenMinimalUnitString(BigInt('1337').toString(10), 18)).toEqual(
      '0.000000000000001337',
    );
    expect(fromTokenMinimalUnitString(BigInt('123456').toString(), 5)).toEqual(
      '1.23456',
    );
    expect(fromTokenMinimalUnitString(BigInt('123456').toString(), 5)).toEqual(
      '1.23456',
    );
    expect(
      fromTokenMinimalUnitString(BigInt('1234560000000000000').toString(), 18),
    ).toEqual('1.23456');
    expect(
      fromTokenMinimalUnitString(BigInt('1000000000000000000').toString(), 18),
    ).toEqual('1');
    expect(fromTokenMinimalUnitString(BigInt('1').toString(), 18)).toEqual(
      '0.000000000000000001',
    );
    expect(fromTokenMinimalUnitString(BigInt('0').toString(), 18)).toEqual('0');
    expect(
      fromTokenMinimalUnitString(BigInt('123456789').toString(), 5),
    ).toEqual('1234.56789');
    expect(
      fromTokenMinimalUnitString(
        BigInt('1234567890000000000987654321').toString(),
        18,
      ),
    ).toEqual('1234567890.000000000987654321');
    expect(
      fromTokenMinimalUnitString(
        BigInt('10000000000000000000000000000001').toString(),
        18,
      ),
    ).toEqual('10000000000000.000000000000000001');
    expect(
      fromTokenMinimalUnitString(
        BigInt('10000000000000000000000000000000').toString(),
        18,
      ),
    ).toEqual('10000000000000');
    expect(
      fromTokenMinimalUnitString(BigInt('3900229504248293869').toString(), 18),
    ).toEqual('3.900229504248293869');
    expect(
      fromTokenMinimalUnitString(
        BigInt('92836465327282987373728723').toString(),
        18,
      ),
    ).toEqual('92836465.327282987373728723');
    expect(
      fromTokenMinimalUnitString(BigInt('6123512631253').toString(), 16),
    ).toEqual('0.0006123512631253');
    expect(
      fromTokenMinimalUnitString(
        BigInt('92836465327282987373728723').toString(),
        0,
      ),
    ).toEqual('92836465327282987373728723');
  });
});

describe('Number utils :: toTokenMinimalUnit', () => {
  it('toTokenMinimalUnit using number', () => {
    expect(toTokenMinimalUnit(1337, 6)).toEqual(BigInt('1337000000'));
    expect(toTokenMinimalUnit(1337, 0)).toEqual(BigInt('1337'));
    expect(toTokenMinimalUnit(1337.1, 1)).toEqual(BigInt('13371'));
  });

  it('toTokenMinimalUnit using string', () => {
    expect(toTokenMinimalUnit('1337', 6)).toEqual(BigInt('1337000000'));
    expect(toTokenMinimalUnit('1337', 0)).toEqual(BigInt('1337'));
    expect(toTokenMinimalUnit('1337.1', 2)).toEqual(BigInt('133710'));
  });

  it('toTokenMinimalUnit using BN number', () => {
    expect(toTokenMinimalUnit(BigInt('1337'), 0)).toEqual(BigInt('1337'));
    expect(toTokenMinimalUnit(BigInt('1337'), 6)).toEqual(BigInt('1337000000'));
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
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 0)).toEqual('1337');
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 6)).toEqual('0.00134');
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 10)).toEqual('< 0.00001');
    expect(renderFromTokenMinimalUnit(BigInt('0'), 10)).toEqual('0');
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
    expect(renderFromWei(BigInt('133700000000000000'))).toEqual('0.1337');
    expect(renderFromWei(BigInt('1337'))).toEqual('< 0.00001');
    expect(renderFromWei(BigInt('0'))).toEqual('0');
  });
});

describe('Number utils :: localizeLargeNumber', () => {
  let i18n: { t: (k: string) => string };

  beforeEach(() => {
    i18n = {
      t: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'token.trillion_abbreviation': 'T',
          'token.billion_abbreviation': 'B',
          'token.million_abbreviation': 'M',
        };
        return translations[key];
      }),
    };
  });

  it('localizes numbers in the trillions correctly', () => {
    const number = 1500000000000;
    const result = localizeLargeNumber(i18n, number);
    expect(result).toBe('1.50T');
    expect(i18n.t).toHaveBeenCalledWith('token.trillion_abbreviation');
  });

  it('localizes numbers in the billions correctly', () => {
    const number = 1500000000;
    const result = localizeLargeNumber(i18n, number);
    expect(result).toBe('1.50B');
    expect(i18n.t).toHaveBeenCalledWith('token.billion_abbreviation');
  });

  it('localizes numbers in the millions correctly', () => {
    const number = 1500000;
    const result = localizeLargeNumber(i18n, number);
    expect(result).toBe('1.50M');
    expect(i18n.t).toHaveBeenCalledWith('token.million_abbreviation');
  });

  it('formats numbers below one million correctly', () => {
    const number = 123456.789;
    const result = localizeLargeNumber(i18n, number);
    expect(result).toBe('123456.79');
    expect(i18n.t).not.toHaveBeenCalled();
  });

  it('handles exact boundary conditions correctly', () => {
    const trillion = 1000000000000;
    const billion = 1000000000;
    const million = 1000000;

    expect(localizeLargeNumber(i18n, trillion)).toBe('1.00T');
    expect(i18n.t).toHaveBeenCalledWith('token.trillion_abbreviation');

    expect(localizeLargeNumber(i18n, billion)).toBe('1.00B');
    expect(i18n.t).toHaveBeenCalledWith('token.billion_abbreviation');

    expect(localizeLargeNumber(i18n, million)).toBe('1.00M');
    expect(i18n.t).toHaveBeenCalledWith('token.million_abbreviation');
  });
});

describe('Number utils :: hexToBigInt', () => {
  it('hexToBigInt', () => {
    expect(Number(hexToBigInt('0x539'))).toBe(1337);
  });
  it('handles non-string values', () => {
    const newBN = BigInt(1);
    expect(hexToBigInt(newBN)).toBe(newBN);
  });
});

describe('Number utils :: isBigInt', () => {
  it('isBigInt', () => {
    const notABN = '0x539';
    expect(isBigInt(notABN)).toEqual(false);
    expect(isBigInt(BigInt(1337))).toEqual(true);
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

  it('converts number-typed wei correctly instead of returning zero', () => {
    const weiAsNumber = Number(toWei('1'));
    expect(weiToFiat(weiAsNumber, 1, 'usd')).toEqual('$1.00');
    expect(weiToFiat(weiAsNumber, 0.5, 'usd')).toEqual('$0.50');
  });

  it('returns zero fiat for zero wei', () => {
    expect(weiToFiat(0n, 1, 'usd')).toEqual('$0.00');
    expect(weiToFiat(0, 1, 'usd')).toEqual('$0.00');
  });

  it('returns undefined when conversionRate is falsy', () => {
    expect(weiToFiat(toWei('1'), null, 'usd')).toBeUndefined();
    expect(weiToFiat(toWei('1'), 0, 'usd')).toBeUndefined();
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
    const one = safeNumberToBigInt(Math.pow(10, 18));
    const ten = safeNumberToBigInt(Math.pow(10, 19));
    const decimal = safeNumberToBigInt(Math.pow(10, 17));
    const aThird = safeNumberToBigInt('0x4a03ce68d215534');
    expect(fiatNumberToWei('0.1234512345', 0.1234512345)).toEqual(one);
    expect(fiatNumberToWei('0.5', 0.5)).toEqual(one);
    expect(fiatNumberToWei('100', 10)).toEqual(ten);
    expect(fiatNumberToWei('1', 10)).toEqual(decimal);
    expect(fiatNumberToWei('1', 3)).toEqual(aThird);
  });

  it('returns BigInt zero when fiat value is zero', () => {
    expect(fiatNumberToWei('0', 10)).toEqual(BigInt(0));
    expect(fiatNumberToWei(0, 10)).toEqual(BigInt(0));
  });

  it('returns BigInt zero when conversion rate is zero', () => {
    expect(fiatNumberToWei('100', 0)).toEqual(BigInt(0));
  });

  it('returns BigInt zero when result would be Infinity', () => {
    expect(fiatNumberToWei(Infinity, 1)).toEqual(BigInt(0));
  });

  it('returns BigInt zero when result is NaN', () => {
    expect(fiatNumberToWei(NaN, 1)).toEqual(BigInt(0));
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
    ).toEqual(safeNumberToBigInt('1000000000000000000'));
    i = 1;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBigInt('15375'));
    i = 2;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBigInt('4761904761904'));
    i = 3;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBigInt('205761296296296300'));
    i = 4;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBigInt('4761'));
    i = 5;
    expect(
      fiatNumberToTokenMinimalUnit(
        fiatValues[i],
        conversionRates[i],
        exchangeRates[i],
        decimals[i],
      ),
    ).toEqual(safeNumberToBigInt('56822378925'));
  });
});

describe('Number utils :: balanceToFiat', () => {
  it('balanceToFiat', () => {
    expect(balanceToFiat(0.1, 0.1, 0.1, 'usd')).toEqual('$0.00');
    expect(balanceToFiat(0.0001, 0.1, 0.1, 'usd')).toEqual('$0.00');
  });

  it('returns undefined when conversionRate is undefined', () => {
    expect(balanceToFiat(0.1, undefined, 0.1, 'usd')).toEqual(undefined);
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
  it('converts string and number to hexadecimal', () => {
    expect(toHexadecimal('001')).toEqual('1');
    expect(toHexadecimal('0x01')).toEqual('0x01');
    expect(toHexadecimal(2)).toEqual('2');
    expect(toHexadecimal(1232)).toEqual('4d0');
    expect(
      toHexadecimal('123456789012345678901234567890123456789012345678'),
    ).toEqual('159ffe6f22fd5cc42c524df6fd5e28d0de38f34e');
  });

  it('returns "0" for null and undefined', () => {
    expect(toHexadecimal(null)).toEqual('0');
    expect(toHexadecimal(undefined)).toEqual('0');
  });
});

describe('Number utils :: fastSplit', () => {
  it('splits on the divider character', () => {
    expect(fastSplit('1650000007.7')).toEqual('1650000007');
    expect(fastSplit('1650000007')).toEqual('1650000007');
    expect(fastSplit('test string', ' ')).toEqual('test');
  });
});

describe('Number utils :: safeNumberToBigInt', () => {
  it.each([
    ['positive decimal string', '1650000007.7', BigInt('1650000007')],
    ['positive decimal number', 1650000007.7, BigInt('1650000007')],
    ['positive integer string', '16500', BigInt('16500')],
    ['positive integer number', 16500, BigInt('16500')],
    ['negative decimal string', '-1650000007.7', BigInt('-1650000007')],
    ['negative decimal number', -1650000007.7, BigInt('-1650000007')],
    ['negative integer string', '-16500', BigInt('-16500')],
    ['negative integer number', -16500, BigInt('-16500')],
    ['positive hex without prefix', '75BCD15', BigInt('123456789')],
    ['positive hex with 0x prefix', '0x75BCD15', BigInt('123456789')],
    ['negative hex without prefix', '-75BCD15', BigInt('-123456789')],
    ['negative hex with -0x prefix', '-0x75BCD15', BigInt('-123456789')],
    ['decimal zero string', '0', BigInt('0')],
    ['hex zero', '0x0', BigInt('0')],
    ['invalid hex string', '0xNaN', BigInt('0')],
    ['NaN', NaN, BigInt('0')],
  ] as const)('safely converts %s to BigInt', (_label, input, expected) => {
    expect(safeNumberToBigInt(input as number | string)).toBe(expected);
  });

  it('preserves full precision for large negative hex values beyond Number.MAX_SAFE_INTEGER', () => {
    // 0x20000000000001 = 2^53 + 1, which would lose precision via parseInt
    const largeNegativeHex = '-0x20000000000001';
    expect(safeNumberToBigInt(largeNegativeHex)).toBe(
      -BigInt('0x20000000000001'),
    );
  });

  it('preserves full precision for very large negative hex values', () => {
    const veryLargeNegativeHex = '-0xffffffffffffffffffffffff';
    expect(safeNumberToBigInt(veryLargeNegativeHex)).toBe(
      -BigInt('0xffffffffffffffffffffffff'),
    );
  });
});

describe('Number utils :: isNumber', () => {
  it('returns true for valid number strings', () => {
    expect(isNumber('1650.7')).toBe(true);
    expect(isNumber('1000')).toBe(true);
    expect(isNumber('0.0001')).toBe(true);
    expect(isNumber('0001')).toBe(true);
    expect(isNumber('1')).toBe(true);
  });

  it('returns false for invalid number strings', () => {
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

describe('Number utils :: isNumberValue', () => {
  it('returns true for valid number types', () => {
    expect(isNumberValue(1650.7)).toBe(true);
    expect(isNumberValue(1000)).toBe(true);
    expect(isNumberValue(0.0001)).toBe(true);
    expect(isNumberValue(-0.0001)).toBe(true);
    expect(isNumberValue(1)).toBe(true);
    expect(isNumberValue(1e-10)).toBe(true);
  });

  it('returns true for valid number string types', () => {
    expect(isNumberValue('1650.7')).toBe(true);
    expect(isNumberValue('1000')).toBe(true);
    expect(isNumberValue('.01')).toBe(true);
    expect(isNumberValue('0.0001')).toBe(true);
    expect(isNumberValue('0001')).toBe(true);
    expect(isNumberValue('-0.0001')).toBe(true);
    expect(isNumberValue('1')).toBe(true);
    expect(isNumberValue('1e-10')).toBe(true);
  });

  it('returns false for invalid number values', () => {
    expect(isNumberValue('..7')).toBe(false);
    expect(isNumberValue('1..1')).toBe(false);
    expect(isNumberValue('0..')).toBe(false);
    expect(isNumberValue('a.0001')).toBe(false);
    expect(isNumberValue('00a01')).toBe(false);
    expect(isNumberValue('1,.')).toBe(false);
    expect(isNumberValue('1,')).toBe(false);
    expect(isNumberValue('.')).toBe(false);
    expect(isNumberValue('a¡1')).toBe(false);
    expect(isNumberValue(undefined)).toBe(false);
    expect(isNumberValue(null)).toBe(false);
  });
});

describe('Number utils :: dotAndCommaDecimalFormatter', () => {
  it('returns the number unchanged when it contains no dot or comma', () => {
    expect(dotAndCommaDecimalFormatter('1650')).toBe('1650');
  });
  it('returns the number unchanged when it contains a dot', () => {
    expect(dotAndCommaDecimalFormatter('1650.7')).toBe('1650.7');
  });
  it('replaces the comma with a decimal when it contains a dot', () => {
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

  it('returns false when a non-number is passed to isNumberScientificNotationWhenString', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isNumberScientificNotationWhenString('1.337e-6' as any)).toEqual(
      false,
    );
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isNumberScientificNotationWhenString('1.337e-7' as any)).toEqual(
      false,
    );
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isNumberScientificNotationWhenString('1.337e20' as any)).toEqual(
      false,
    );
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isNumberScientificNotationWhenString('1.337e21' as any)).toEqual(
      false,
    );
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
    expect(isZeroValue(BigInt('0'))).toBe(true);
  });
});

describe('Number utils :: formatValueToMatchTokenDecimals', () => {
  it('returns a formatted value when submitted decimals is 0', () => {
    expect(formatValueToMatchTokenDecimals('1.0', 0)).toBe('1');
  });
  it('returns the value unchanged when value is null', () => {
    expect(formatValueToMatchTokenDecimals(null, 18)).toBe(null);
  });
  it('returns the value unchanged when decimal is undefined', () => {
    expect(formatValueToMatchTokenDecimals('1', undefined)).toBe('1');
  });
  it('returns the value unchanged when decimal is null', () => {
    expect(formatValueToMatchTokenDecimals('1', null)).toBe('1');
  });
  it('returns the value unchanged when decimal is not a number', () => {
    expect(formatValueToMatchTokenDecimals('1', 'a')).toBe('1');
  });
  it('returns the value unchanged when value decimal count is at or below the submitted decimal', () => {
    expect(formatValueToMatchTokenDecimals('1.2348', 4)).toBe('1.2348');
  });
  it('truncates the value when value decimal count exceeds the submitted decimal', () => {
    expect(formatValueToMatchTokenDecimals('1.234567', 4)).toBe('1.2346');
  });
});

describe('Number utils :: safeBigIntToHex', () => {
  it('returns hex string', () => {
    expect(safeBigIntToHex(BigInt('255'))).toBe('0xff');
  });

  it.each([undefined, null])(
    'returns original value if input is %s',
    (value) => {
      expect(safeBigIntToHex(value)).toBe(value);
    },
  );
});

describe('Number utils :: addHexPrefix', () => {
  it('returns a non-string value unchanged', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(addHexPrefix(42 as any)).toBe(42);
  });

  it('is idempotent for already lowercase 0x-prefixed strings', () => {
    expect(addHexPrefix('0x1a2b')).toBe('0x1a2b');
  });

  it('is idempotent for already lowercase -0x-prefixed strings', () => {
    expect(addHexPrefix('-0x1a2b')).toBe('-0x1a2b');
  });

  it('normalizes uppercase 0X prefix to lowercase 0x', () => {
    expect(addHexPrefix('0X1A2B')).toBe('0x1A2B');
  });

  it('normalizes uppercase -0X prefix to lowercase -0x', () => {
    expect(addHexPrefix('-0X1A2B')).toBe('-0x1A2B');
  });

  it('prepends 0x to a plain hex string', () => {
    expect(addHexPrefix('1a2b')).toBe('0x1a2b');
  });

  it('prepends -0x to a negative hex string without prefix', () => {
    expect(addHexPrefix('-1a2b')).toBe('-0x1a2b');
  });
});

describe('Number utils :: renderNumber', () => {
  it('returns integer strings longer than 5 characters unchanged', () => {
    expect(renderNumber('123456789')).toBe('123456789');
  });

  it('returns integer strings of 5 characters or fewer unchanged', () => {
    expect(renderNumber('12345')).toBe('12345');
  });

  it('returns the full number when there is no decimal point', () => {
    expect(renderNumber('1')).toBe('1');
  });

  it('trims to 5 decimal places when a decimal point is present', () => {
    expect(renderNumber('1.123456789')).toBe('1.12345');
  });

  it('keeps numbers with 5 or fewer decimal places intact', () => {
    expect(renderNumber('1.123')).toBe('1.123');
  });
});

describe('Number utils :: toGwei', () => {
  it('converts whole-number ether to gwei', () => {
    expect(toGwei(BigInt('1000000000000000000'))).toBe(1000000000n);
  });

  it('converts fractional ether wei value to gwei without throwing', () => {
    // 1e17 wei = 0.1 ether = 100000000 gwei
    expect(toGwei(BigInt('100000000000000000'))).toBe(100000000n);
  });

  it('converts a wei value that produces a decimal ether string without throwing', () => {
    // 1337000000000 wei = 0.000001337 ether = 1337 gwei
    expect(toGwei(BigInt('1337000000000'))).toBe(1337n);
  });

  it('handles negative wei values', () => {
    expect(toGwei(BigInt('-1000000000000000000'))).toBe(-1000000000n);
  });

  it('returns 0n for zero input', () => {
    expect(toGwei(BigInt('0'))).toBe(0n);
  });
});

describe('Number utils :: fromTokenMinimalUnit with high decimals', () => {
  it('handles decimals = 21 without throwing', () => {
    expect(
      fromTokenMinimalUnit(BigInt('1000000000000000000000'), 21, false),
    ).toBe('1');
  });

  it('handles decimals = 36 without throwing', () => {
    expect(
      fromTokenMinimalUnit(
        BigInt('1000000000000000000000000000000000000'),
        36,
        false,
      ),
    ).toBe('1');
  });
});

describe('Number utils :: toTokenMinimalUnit with high decimals', () => {
  it('handles decimals = 21 without throwing', () => {
    expect(toTokenMinimalUnit('1', 21)).toBe(BigInt('1000000000000000000000'));
  });

  it('handles decimals = 36 without throwing', () => {
    expect(toTokenMinimalUnit('1', 36)).toBe(
      BigInt('1000000000000000000000000000000000000'),
    );
  });
});
