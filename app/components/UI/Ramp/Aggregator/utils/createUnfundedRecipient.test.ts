import { createUnfundedRecipient } from './createUnfundedRecipient';

describe('createUnfundedRecipient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a checksummed 20-byte address from getRandomValues', () => {
    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        if (array) {
          new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(
            0x11,
          );
        }
        return array;
      });

    expect(createUnfundedRecipient()).toBe(
      '0x1111111111111111111111111111111111111111',
    );
  });
});
