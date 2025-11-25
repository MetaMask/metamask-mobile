import BN from 'bnjs4';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import ppomUtil from '../../../../lib/ppom/ppom-util';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../util/transaction-controller';
// eslint-disable-next-line import/no-namespace
import * as EngineNetworkUtils from '../../../../util/networks/engineNetworkUtils';
import { AssetType, TokenStandard } from '../types/token';
import { InitSendLocation } from '../constants/send';
import {
  addLeadingZeroIfNeeded,
  convertCurrency,
  formatToFixedDecimals,
  fromBNWithDecimals,
  fromHexWithDecimals,
  fromTokenMinUnits,
  getFractionLength,
  getLayer1GasFeeForSend,
  handleSendPageNavigation,
  isValidPositiveNumericString,
  prepareEVMTransaction,
  submitEvmTransaction,
  toBNWithDecimals,
  toTokenMinimalUnit,
} from './send';

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../../lib/ppom/ppom-util', () => ({
  ...jest.requireActual('../../../../lib/ppom/ppom-util'),
  validateRequest: jest.fn(),
}));

describe('handleSendPageNavigation', () => {
  it('navigates to legacy send page', () => {
    const mockNavigate = jest.fn();
    handleSendPageNavigation(mockNavigate, {
      location: InitSendLocation.WalletActions,
      isSendRedesignEnabled: false,
      asset: {
        name: 'ETHEREUM',
      } as AssetType,
    });
    expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
  });
  it('navigates to send redesign page', () => {
    const mockNavigate = jest.fn();
    handleSendPageNavigation(mockNavigate, {
      location: InitSendLocation.WalletActions,
      isSendRedesignEnabled: true,
      asset: {
        name: 'ETHEREUM',
      } as AssetType,
    });
    expect(mockNavigate.mock.calls[0][0]).toEqual('Send');
  });
});

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
          decimals: 0,
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

  it('prepares transaction for ERC721 NFT token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyNFT',
          address: '0x123',
          chainId: '0x1',
          tokenId: '0x1',
          standard: TokenStandard.ERC721,
        } as AssetType,
        { from: '0x123', to: '0x456' },
      ),
    ).toStrictEqual({
      data: '0x23b872dd000000000000000000000000000000000000000000000000000000000000012300000000000000000000000000000000000000000000000000000000000004560000000000000000000000000000000000000000000000000000000000000001',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });

  it('prepares transaction for ERC1155 NFT token', () => {
    expect(
      prepareEVMTransaction(
        {
          name: 'MyNFT',
          address: '0x123',
          chainId: '0x1',
          tokenId: '0x1',
          standard: TokenStandard.ERC1155,
        } as AssetType,
        { from: '0x123', to: '0x456', value: '100' },
      ),
    ).toStrictEqual({
      data: '0xf242432a000000000000000000000000000000000000000000000000000000000000012300000000000000000000000000000000000000000000000000000000000004560000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
      from: '0x123',
      to: '0x123',
      value: '0x0',
    });
  });
});

describe('submitEvmTransaction', () => {
  it('invokes TransactionUtils.addTransaction', () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtils, 'addTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          result: Promise.resolve('123'),
          transactionMeta: { id: '123' } as TransactionMeta,
        }),
      );
    submitEvmTransaction({
      asset: { isNative: true } as AssetType,
      chainId: '0x1',
      from: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      to: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA967b',
      value: '10',
    });
    expect(mockAddTransaction).toHaveBeenCalled();
  });

  it('invokes ppomUtil.validateRequest', () => {
    jest.spyOn(TransactionUtils, 'addTransaction').mockImplementation(() =>
      Promise.resolve({
        result: Promise.resolve('123'),
        transactionMeta: { id: '123' } as TransactionMeta,
      }),
    );
    const mockValidateRequest = jest
      .spyOn(ppomUtil, 'validateRequest')
      .mockImplementation(() => Promise.resolve());

    submitEvmTransaction({
      asset: { isNative: true } as AssetType,
      chainId: '0x1',
      from: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      to: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA967b',
      value: '10',
    });
    expect(mockValidateRequest).toHaveBeenCalled();
  });

  describe('sets transaction type', () => {
    it.each([
      [TransactionType.simpleSend, { isNative: true } as AssetType],
      [
        TransactionType.tokenMethodTransfer,
        { standard: TokenStandard.ERC20 } as AssetType,
      ],
      [
        TransactionType.tokenMethodTransferFrom,
        { standard: TokenStandard.ERC721 } as AssetType,
      ],
      [
        TransactionType.tokenMethodSafeTransferFrom,
        { standard: TokenStandard.ERC1155 } as AssetType,
      ],
    ])('as %s for %s token', (expectedType, asset) => {
      const mockAddTransaction = jest
        .spyOn(TransactionUtils, 'addTransaction')
        .mockImplementation(() =>
          Promise.resolve({
            result: Promise.resolve('123'),
            transactionMeta: { id: '123' } as TransactionMeta,
          }),
        );
      submitEvmTransaction({
        asset,
        chainId: '0x1',
        from: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        to: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA967b',
        value: '10',
      });

      expect(mockAddTransaction.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          type: expectedType,
        }),
      );
    });
  });
});

describe('formatToFixedDecimals', () => {
  it('return `0` if value is not defined', () => {
    expect(formatToFixedDecimals(undefined as unknown as string)).toEqual('0');
    expect(formatToFixedDecimals(null as unknown as string)).toEqual('0');
  });
  it('remove trailing zeros', () => {
    expect(formatToFixedDecimals('1.0000')).toEqual('1');
  });
  it('does not remove trailing zeros if trimTrailingZero is false', () => {
    expect(formatToFixedDecimals('1.0000', 2, undefined, false)).toEqual(
      '1.00',
    );
  });
  it('return `0` if value is equivalent to 0', () => {
    expect(formatToFixedDecimals('0.0000')).toEqual('0');
  });
  it('return correct string for very small values', () => {
    expect(formatToFixedDecimals('0.01', 1)).toEqual('< 0.1');
    expect(formatToFixedDecimals('0.001', 2)).toEqual('< 0.01');
    expect(formatToFixedDecimals('0.0001', 3)).toEqual('< 0.001');
    expect(formatToFixedDecimals('0.00001', 4)).toEqual('< 0.0001');
  });
  it('formats value with passed number of decimals', () => {
    expect(formatToFixedDecimals('1', 4)).toEqual('1');
    expect(formatToFixedDecimals('1.01010101', 4)).toEqual('1.0101');
  });
});

describe('toBNWithDecimals', () => {
  it('converts value to bignumber correctly', () => {
    expect(toBNWithDecimals('1.20', 5).toString()).toEqual('120000');
  });
  it('remove addtional decimal part', () => {
    expect(toBNWithDecimals('.123123', 3).toString()).toEqual('123');
  });
  it('converts decimal value to bignumber correctly', () => {
    expect(toBNWithDecimals('.1', 5).toString()).toEqual('10000');
  });
  it('converts 0 value to bignumber correctly', () => {
    expect(toBNWithDecimals('0', 5).toString()).toEqual('0');
  });
});

describe('fromBNWithDecimals', () => {
  it('converts bignumber to string correctly', () => {
    expect(
      fromBNWithDecimals(toBNWithDecimals('1.20', 5), 5).toString(),
    ).toEqual('1.2');
  });
  it('converts decimal value to bignumber correctly', () => {
    expect(fromBNWithDecimals(toBNWithDecimals('.1', 5), 5).toString()).toEqual(
      '0.1',
    );
  });
  it('converts 0 value to bignumber correctly', () => {
    expect(fromBNWithDecimals(toBNWithDecimals('0', 5), 5).toString()).toEqual(
      '0',
    );
  });
});

describe('fromHexWithDecimals', () => {
  it('converts hex to string with decimals correctly', () => {
    expect(fromHexWithDecimals('0xa12', 5).toString()).toEqual('0.02578');
    expect(fromHexWithDecimals('0x5', 0).toString()).toEqual('5');
    expect(fromHexWithDecimals('0x0', 2).toString()).toEqual('0');
  });
});

describe('fromTokenMinUnits', () => {
  it('converts hex to string with decimals correctly', () => {
    expect(fromTokenMinUnits('0', 5).toString()).toEqual('0x0');
    expect(fromTokenMinUnits('1000', 2).toString()).toEqual('0x186a0');
    expect(fromTokenMinUnits('2500', 18).toString()).toEqual(
      '0x878678326eac900000',
    );
  });
});

describe('getLayer1GasFeeForSend', () => {
  it('call transaction-controller function getLayer1GasFee', () => {
    const mockGetLayer1GasFee = jest
      .spyOn(EngineNetworkUtils, 'fetchEstimatedMultiLayerL1Fee')
      .mockImplementation(() => Promise.resolve('0x186a0'));
    getLayer1GasFeeForSend({
      asset: { decimals: 2 } as unknown as AssetType,
      chainId: '0x1',
      from: '0x123',
      value: '10',
    });
    expect(mockGetLayer1GasFee).toHaveBeenCalled();
  });
});

describe('toTokenMinimalUnit', () => {
  it('converts string value to token minimal units', () => {
    expect(toTokenMinimalUnit('.1', 18)).toEqual(
      new BN('100000000000000000', 10),
    );
    expect(toTokenMinimalUnit('1.75', 4)).toEqual(new BN('17500'));
    expect(toTokenMinimalUnit('0', 0)).toEqual(new BN('0'));
    expect(toTokenMinimalUnit('0', 2)).toEqual(new BN('0'));
    expect(toTokenMinimalUnit('', 2)).toEqual(new BN('0'));
    expect(toTokenMinimalUnit('0.75', 6)).toEqual(new BN('750000'));
    expect(toTokenMinimalUnit('0.750251', 2)).toEqual(new BN('75'));
  });
});

describe('getFractionLength', () => {
  it('return width of fractional part', () => {
    expect(getFractionLength('.1')).toEqual(1);
    expect(getFractionLength('0')).toEqual(0);
    expect(getFractionLength('.0001')).toEqual(4);
    expect(getFractionLength('0.075')).toEqual(3);
  });
});

describe('convertCurrency', () => {
  it('apply conversion rate to passed value', () => {
    expect(convertCurrency('120.75', 0.5, 4, 2)).toEqual('60.37');
    expect(convertCurrency('120.75', 0.25, 4, 4)).toEqual('30.1875');
    expect(convertCurrency('0.01', 10, 4, 0)).toEqual('0');
  });
});

describe('isValidPositiveNumericString', () => {
  it('return true for decimal values and false otherwise', () => {
    expect(isValidPositiveNumericString('10')).toBe(true);
    expect(isValidPositiveNumericString('10.01')).toBe(true);
    expect(isValidPositiveNumericString('.01')).toBe(true);
    expect(isValidPositiveNumericString('-0.01')).toBe(false);
    expect(isValidPositiveNumericString('abc')).toBe(false);
    expect(isValidPositiveNumericString(' ')).toBe(false);
  });
});

describe('addLeadingZeroIfNeeded', () => {
  it('add zero to decimal value if needed', () => {
    expect(addLeadingZeroIfNeeded(undefined)).toEqual(undefined);
    expect(addLeadingZeroIfNeeded('')).toEqual('');
    expect(addLeadingZeroIfNeeded('.001')).toEqual('0.001');
    expect(addLeadingZeroIfNeeded('0.001')).toEqual('0.001');
    expect(addLeadingZeroIfNeeded('100')).toEqual('100');
  });
});
