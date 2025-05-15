import { getRandomBytes } from './bytes';

describe('getRandomBytes', () => {
  it('generates an Uint8Array of the specified size greater than zero', () => {
    const size = 16;
    const randomBytes = getRandomBytes(size);

    expect(randomBytes).toBeInstanceOf(Uint8Array);
    expect(randomBytes).toHaveLength(size);
  });

  it('generates an empty array for size zero', () => {
    const size = 0;
    const randomBytes = getRandomBytes(size);

    expect(randomBytes).toBeInstanceOf(Uint8Array);
    expect(randomBytes).toHaveLength(size);
  });

  it('generates different values on subsequent calls', () => {
    const size = 16;
    const randomBytes1 = getRandomBytes(size);
    const randomBytes2 = getRandomBytes(size);

    // Ensure the two arrays are not identical
    expect(randomBytes1).not.toEqual(randomBytes2);
  });

  it('throws an error if the input is not valid', () => {
    expect(() => getRandomBytes(-1)).toThrow();
  });
});
