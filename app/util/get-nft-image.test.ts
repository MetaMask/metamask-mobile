import { getNftImage } from './get-nft-image';

describe('getNftImage', () => {
  it('returns original image if string', () => {
    const image =
      'ipfs://bafybeidgklvljyifilhtrxzh77brgnhcy6s2wxoxqc2l73zr2nxlwuxfcy';
    const result = getNftImage(image);
    expect(result).toBe(image);
  });

  it('returns the first image if image is an array', () => {
    const image = [
      'ipfs://bafybeidgklvljyifilhtrxzh77brgnhcy6s2wxoxqc2l73zr2nxlwuxfcy',
      'ipfs://bafybeic26kitpujb3q5h5w7yovmvgmtxl3y4ldsb2pfgual5jq62emsmxq',
    ];
    const result = getNftImage(image);
    expect(result).toBe(image[0]);
  });

  it('returns undefined if image is missing', () => {
    const image = undefined;
    const result = getNftImage(image);
    expect(result).toBeUndefined();
  });

  it('returns undefined if image is not a type we were expecting ', () => {
    const image = { badType: 'badType' } as unknown as string;
    const result = getNftImage(image);
    expect(result).toBeUndefined();
  });
});
