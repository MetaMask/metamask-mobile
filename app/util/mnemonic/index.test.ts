import {
  shuffle,
  compareMnemonics,
  uint8ArrayToMnemonic,
  convertEnglishWordlistIndicesToCodepoints,
  convertMnemonicToWordlistIndices,
  pickUniqueMissingWordSlots,
} from '.';

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

  it('shuffles number arrays without mutating the input', () => {
    const input = [0, 1, 2, 3];
    const result = shuffle(input);
    expect(input).toEqual([0, 1, 2, 3]);
    expect(result).toHaveLength(4);
    expect([...result].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('mnemonic::pickUniqueMissingWordSlots', () => {
  it('returns unique words for a phrase that contains duplicates', () => {
    // Valid BIP-39 pattern: same word can appear more than once.
    const wordsWithDuplicate = [
      'apple',
      'banana',
      'apple',
      'cherry',
      'date',
      'elder',
      'fig',
      'grape',
      'honey',
      'iris',
      'jade',
      'kiwi',
    ];

    for (let i = 0; i < 30; i++) {
      const slots = pickUniqueMissingWordSlots(wordsWithDuplicate);
      const removed = slots.map((index) => wordsWithDuplicate[index]);
      expect(slots).toHaveLength(3);
      expect(new Set(removed).size).toBe(3);
      slots.forEach((index) => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(wordsWithDuplicate.length);
      });
    }
  });

  it('falls back when repeated random row/column picks keep selecting the same word', () => {
    // With Math.random always 0, Fisher–Yates always yields rows [1,2,3] and
    // column 1 → indexes 4, 7, and 10. Set those to the same word so attempts collide.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const wordsWithCollisionPath = [
      'w0',
      'w1',
      'w2',
      'w3',
      'same',
      'w5',
      'w6',
      'same',
      'w8',
      'w9',
      'same',
      'w11',
    ];

    try {
      const slots = pickUniqueMissingWordSlots(wordsWithCollisionPath);
      const removed = slots.map((index) => wordsWithCollisionPath[index]);
      expect(slots).toHaveLength(3);
      expect(new Set(removed).size).toBe(3);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('returns an empty array for empty input', () => {
    expect(pickUniqueMissingWordSlots([])).toEqual([]);
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
    'abandon',
    'jellyfish',
  ];

  it('should convert a Uint8Array to a seed phrase', () => {
    const uint8Array = new Uint8Array([
      0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8, 0, 9, 0,
    ]);
    const expectedOutput =
      'apple banana carrot dog elephant fox grape horse abandon jellyfish';

    const result = uint8ArrayToMnemonic(uint8Array, mockWordlist);

    expect(result).toEqual(expectedOutput);
  });

  it('should handle an empty Uint8Array', () => {
    expect(() =>
      uint8ArrayToMnemonic(new Uint8Array([]), mockWordlist),
    ).toThrow('The method uint8ArrayToMnemonic expects a non-empty array');
  });
});

describe('mnemonic::convertEnglishWordlistIndicesToCodepoints', () => {
  const mockWordlist = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
  ];

  it('should convert wordlist indices to Unicode code points', () => {
    // Arrange
    const wordlistIndices = new Uint8Array([0, 0, 1, 0, 2, 0, 3, 0]); // indices 0, 1, 2, 3
    const expectedOutput = 'abandon ability able about';

    // Act
    const result = convertEnglishWordlistIndicesToCodepoints(
      wordlistIndices,
      mockWordlist,
    );

    // Assert
    expect(result.toString()).toEqual(expectedOutput);
  });

  it('should handle single word index', () => {
    // Arrange
    const wordlistIndices = new Uint8Array([0, 0]); // index 0
    const expectedOutput = 'abandon';

    // Act
    const result = convertEnglishWordlistIndicesToCodepoints(
      wordlistIndices,
      mockWordlist,
    );

    // Assert
    expect(result.toString()).toEqual(expectedOutput);
  });

  it('should handle multiple word indices', () => {
    // Arrange
    const wordlistIndices = new Uint8Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]); // indices 0, 1, 2, 3, 4
    const expectedOutput = 'abandon ability able about above';

    // Act
    const result = convertEnglishWordlistIndicesToCodepoints(
      wordlistIndices,
      mockWordlist,
    );

    // Assert
    expect(result.toString()).toEqual(expectedOutput);
  });

  it('should throw error for empty indices array', () => {
    // Arrange
    const emptyIndices = new Uint8Array([]);

    // Act & Assert
    expect(() =>
      convertEnglishWordlistIndicesToCodepoints(emptyIndices, mockWordlist),
    ).toThrow('The method uint8ArrayToMnemonic expects a non-empty array');
  });
});

describe('mnemonic::convertMnemonicToWordlistIndices', () => {
  const mockWordlist = [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
  ];

  it('should convert mnemonic to wordlist indices', () => {
    // Arrange
    const mnemonic = Buffer.from('abandon ability able about');
    const expectedIndices = new Uint8Array([0, 0, 1, 0, 2, 0, 3, 0]); // indices 0, 1, 2, 3

    // Act
    const result = convertMnemonicToWordlistIndices(mnemonic, mockWordlist);

    // Assert
    expect(result).toEqual(expectedIndices);
  });

  it('should handle single word mnemonic', () => {
    // Arrange
    const mnemonic = Buffer.from('abandon');
    const expectedIndices = new Uint8Array([0, 0]); // index 0

    // Act
    const result = convertMnemonicToWordlistIndices(mnemonic, mockWordlist);

    // Assert
    expect(result).toEqual(expectedIndices);
  });

  it('should handle multiple word mnemonic', () => {
    // Arrange
    const mnemonic = Buffer.from('abandon ability able about above');
    const expectedIndices = new Uint8Array([0, 0, 1, 0, 2, 0, 3, 0, 4, 0]); // indices 0, 1, 2, 3, 4

    // Act
    const result = convertMnemonicToWordlistIndices(mnemonic, mockWordlist);

    // Assert
    expect(result).toEqual(expectedIndices);
  });

  it('should return -1 indices for words not in wordlist', () => {
    // Arrange
    const mnemonic = Buffer.from('abandon invalidword able');
    // Note: invalidword will have index -1, which becomes 65535 when converted to Uint16

    // Act
    const result = convertMnemonicToWordlistIndices(mnemonic, mockWordlist);

    // Assert
    // The result should contain indices for 'abandon' (0) and 'able' (2), with -1 for 'invalidword'
    const uint16Array = new Uint16Array(result.buffer);
    expect(uint16Array[0]).toBe(0); // abandon
    expect(uint16Array[1]).toBe(65535); // invalidword becomes 65535 when -1 is converted to Uint16
    expect(uint16Array[2]).toBe(2); // able
  });

  it('should handle empty mnemonic', () => {
    // Arrange
    const mnemonic = Buffer.from('');

    // Act
    const result = convertMnemonicToWordlistIndices(mnemonic, mockWordlist);

    // Assert
    // Empty string splits to [''] and indexOf('') returns -1, which becomes 65535 in Uint16
    expect(result).toEqual(new Uint8Array([255, 255]));
  });
});
