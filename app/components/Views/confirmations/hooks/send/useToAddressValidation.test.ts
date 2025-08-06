import Engine from '../../../../../core/Engine';
import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
// eslint-disable-next-line import/no-namespace
import * as ENSUtils from '../../../../../util/ENSUtils';
// eslint-disable-next-line import/no-namespace
import * as ConfusablesUtils from '../../../../../util/confusables';
import useToAddressValidation, {
  shouldSkipValidation,
  ShouldSkipValidationArgs,
  validateToAddress,
} from './useToAddressValidation';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC721AssetSymbol: Promise.resolve(undefined),
    },
  },
}));

const mockState = {
  state: {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-account-id',
            accounts: {
              'evm-account-id': {
                id: 'evm-account-id',
                type: 'eip155:eoa',
                address: '0x12345',
                metadata: {},
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            '0x12345': {
              '0x1': {
                '0x123': '0x5',
              },
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0x12345': {
                balance: '0xDE0B6B3A7640000',
              },
            },
          },
        },
      },
    },
  },
};

describe('shouldSkipValidation', () => {
  it('returns true if to address is not defined', () => {
    expect(
      shouldSkipValidation({
        toAddress: undefined,
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(true);
    expect(
      shouldSkipValidation({
        toAddress: null,
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(true);
    expect(
      shouldSkipValidation({
        toAddress: '',
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(true);
  });
  it('returns true if to address is present in address book', () => {
    expect(
      shouldSkipValidation({
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [],
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(false);
    expect(
      shouldSkipValidation({
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        chainId: '0x1',
        addressBook: {
          '0x1': {
            '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477': {},
          },
        },
        internalAccounts: [],
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(true);
  });
  it('returns true if to address is an internal account', () => {
    expect(
      shouldSkipValidation({
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [],
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(false);
    expect(
      shouldSkipValidation({
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [
          { address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477' },
        ],
      } as unknown as ShouldSkipValidationArgs),
    ).toStrictEqual(true);
  });
});

describe('validateToAddress', () => {
  it('returns warning if address is contract address on mainnet', async () => {
    Engine.context.AssetsContractController.getERC721AssetSymbol = () =>
      Promise.resolve('ABC');
    expect(
      await validateToAddress(
        '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        '0x1',
      ),
    ).toStrictEqual({
      warning:
        'This address is a token contract address. If you send tokens to this address, you will lose them.',
    });
  });

  it('returns error if ens name can not be resolved', async () => {
    jest
      .spyOn(ENSUtils, 'doENSLookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(Promise.resolve(undefined) as any);
    expect(await validateToAddress('test.eth', '0x1')).toStrictEqual({
      error: "Couldn't resolve ENS",
    });
  });

  it('returns warning for confusables', async () => {
    jest
      .spyOn(ENSUtils, 'doENSLookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ ensName: 'test.eth' } as any);
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    expect(await validateToAddress('test.eth', '0x1')).toStrictEqual({
      warning:
        "We have detected a confusable character in the ENS name. Check the ENS name to avoid a potential scam. - 'ⅼ' is similar to 'l'",
    });
  });

  it('returns error for confusables if it has hasZeroWidthPoints', async () => {
    jest
      .spyOn(ENSUtils, 'doENSLookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ ensName: 'test.eth' } as any);
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    jest.spyOn(ConfusablesUtils, 'hasZeroWidthPoints').mockReturnValue(true);
    expect(await validateToAddress('test.eth', '0x1')).toStrictEqual({
      error:
        "We have detected a confusable character in the ENS name. Check the ENS name to avoid a potential scam. - 'ⅼ' is similar to 'l'",
    });
  });
});

describe('useToAddressValidation', () => {
  it('return fields for in address error and warning', () => {
    const { result } = renderHookWithProvider(
      () => useToAddressValidation(),
      mockState as ProviderValues,
    );
    expect(result.current).toStrictEqual({
      toAddressError: undefined,
      toAddressWarning: undefined,
    });
  });
});
