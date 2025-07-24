import { AssetType } from '../../types/token';
import {
  prepareEVMTransaction,
  validateAmount,
  ValidateAmountArgs,
} from './utils';

const getArguments = (params: Record<string, unknown>) =>
  ({
    from: '0x123',
    asset: {},
    accounts: { '0x123': { balance: '0x3635C9ADC5DEA00000' } },
    contractBalances: { '0x111': '0x3B9ACA00' },
    ...params,
  } as unknown as ValidateAmountArgs);

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
      data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000456000000000000000000000000000000000000000000000000000000000003b27c',
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

describe('validateAmount', () => {
  it('returns undefined if no value is passed', () => {
    expect(validateAmount(getArguments({ amount: undefined }))).toStrictEqual(
      undefined,
    );
    expect(validateAmount(getArguments({ amount: null }))).toStrictEqual(
      undefined,
    );
    expect(validateAmount(getArguments({ amount: '' }))).toStrictEqual(
      undefined,
    );
  });

  it('returns invalid value error if value passed is not correct positive decimal', () => {
    expect(validateAmount(getArguments({ amount: 'abc' }))).toStrictEqual(
      'Invalid amount',
    );
    expect(validateAmount(getArguments({ amount: '-100' }))).toStrictEqual(
      'Invalid amount',
    );
  });

  describe('for native token', () => {
    it('does not return error if amount is less than user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '999',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('does not return error if amount is equal to user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '1000',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('return error if amount is greater than user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '1001',
            asset: {
              isNative: true,
            },
          }),
        ),
      ).toStrictEqual('Insufficient funds');
    });
  });

  describe('for ERC20 token', () => {
    it('does not return error if amount is less than user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '999',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('does not return error if amount is equal to user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '1000',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual(undefined);
    });

    it('return error if amount is greater than user balance', () => {
      expect(
        validateAmount(
          getArguments({
            amount: '1001',
            asset: {
              isNative: false,
              address: '0x111',
              decimals: 6,
            },
          }),
        ),
      ).toStrictEqual('Insufficient funds');
    });
  });
});
