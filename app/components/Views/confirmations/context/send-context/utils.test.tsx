import { AssetType } from '../../types/token';
import { prepareEVMTransaction } from './utils';

describe('prepareEVMTransaction', () => {
  it('prepares transaction for native token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'Ethereum',
          address: '0x123',
          isNative: true,
          chainId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0x',
      from: '0x123',
      to: '0x456',
      value: '0x56bc75e2d63100000',
    });
  });

  it('prepares transaction for ERC20 token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyToken',
          address: '0x123',
          chainId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000004560000000000000000000000000000000000000000000000000000000000000064',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });

  it('prepares transaction for NFT token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyNFT',
          address: '0x123',
          chainId: '0x1',
          tokenId: '0x1',
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0x23b872dd000000000000000000000000000000000000000000000000000000000000012300000000000000000000000000000000000000000000000000000000000004560000000000000000000000000000000000000000000000000000000000000001',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });
});
