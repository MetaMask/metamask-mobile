import { shuffle, compareMnemonics, uint8ArrayToMnemonic } from '.';

const mockSRPArrayOne = [
  'ar9gx',
  'e97vw',
  '95wx4',
  'c93d1',
  'zdiai',
  'h07an',
  '78eld',
  'snqx8',
  '1o472',
  'ixpwq',
  'p31fg',
  'vfnfy',
];

const mockSRPArrayTwo = [
  'r6rrh',
  'ujfkr',
  'n8n0h',
  '9fsgb',
  'obyjo',
  'a8wnk',
  'eqcnj',
  '4e55t',
  '170tl',
  'uur4s',
  '4wf4g',
  '242lz',
];

describe('mnemonic::shuffle', () => {
  it('should shuffle the array', () => {
    expect(mockSRPArrayOne.join('')).not.toEqual(
      shuffle(mockSRPArrayOne).join(''),
    );
  });
});

describe('mnemonic::compareMnemonics', () => {
  it('should return false', () => {
    expect(compareMnemonics(mockSRPArrayOne, mockSRPArrayTwo)).toBe(false);
  });
  it('should return true', () => {
    expect(compareMnemonics(mockSRPArrayOne, mockSRPArrayOne)).toBe(true);
  });
});

describe('mnemonic::uint8ArrayToMnemonic', () => {
  const mockWordlist = [
    'apple',
    'banana',
    'carrot',
    'dog',
    'elephant',
    'fox',
    'grape',
    'horse',
    'ice cream',
    'jellyfish',
  ];

  it('should convert a Uint8Array to a seed phrase', () => {
    const uint8Array = new Uint8Array([
      0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8, 0, 9, 0, 10, 0, 11, 0,
    ]);
    const expectedOutput =
      'apple banana carrot dog elephant fox grape horse ice cream jellyfish';

    const result = uint8ArrayToMnemonic(uint8Array, mockWordlist);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an empty Uint8Array', () => {
    expect(() =>
      uint8ArrayToMnemonic(new Uint8Array([]), mockWordlist),
    ).toThrow('The method uint8ArrayToMnemonic expects a non-empty array');
  });
});
