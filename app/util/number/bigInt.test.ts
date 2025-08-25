import {
  bigIntAbs,
  bigIntToHex,
  fromTokenMinimalUnit,
  hexToBigInt,
  renderFromTokenMinimalUnit,
  safeBigIntToHex,
} from './bigInt';

describe('Number utils :: hexToBigInt', () => {
  it('hexToBigInt', () => {
    expect(Number(hexToBigInt('0x539'))).toBe(1337);
  });
  it('should handle number values', () => {
    expect(Number(hexToBigInt(1337))).toBe(1337);
  });
  it('should handle empty string', () => {
    expect(Number(hexToBigInt(''))).toBe(0);
  });
});

describe('Number utils :: bigIntToHex', () => {
  it('bigIntToHex', () => {
    expect(bigIntToHex(BigInt(1337))).toEqual('0x539');
  });
});

describe('Number utils :: safeBigIntToHex', () => {
  it('returns hex string', () => {
    expect(safeBigIntToHex(BigInt(255))).toBe('0xff');
  });

  it.each([undefined, null])(
    'returns original value if input is %s',
    (value) => {
      expect(safeBigIntToHex(value)).toBe(value);
    },
  );
});

describe('Number utils :: bigIntAbs', () => {
  it('returns the absolute value of a BigInt', () => {
    expect(bigIntAbs(BigInt(1337))).toBe(BigInt(1337));
  });

  it('returns the absolute value of a negative BigInt', () => {
    expect(bigIntAbs(BigInt(-1337))).toBe(BigInt(1337));
  });

  it('returns 0 for 0', () => {
    expect(bigIntAbs(BigInt(0))).toBe(BigInt(0));
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

  it('renderFromTokenMinimalUnit using BigInt number', () => {
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 0)).toEqual('1337');
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 6)).toEqual('0.00134');
    expect(renderFromTokenMinimalUnit(BigInt('1337'), 10)).toEqual('< 0.00001');
    expect(renderFromTokenMinimalUnit(BigInt('0'), 10)).toEqual('0');
  });
});
