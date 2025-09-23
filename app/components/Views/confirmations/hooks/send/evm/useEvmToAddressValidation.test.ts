import { AddressBookControllerState } from '@metamask/address-book-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';

import Engine from '../../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as ENSUtils from '../../../../../../util/ENSUtils';
// eslint-disable-next-line import/no-namespace
import * as ConfusablesUtils from '../../../../../../util/confusables';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import {
  shouldSkipValidation,
  useEvmToAddressValidation,
  validateToAddress,
} from './useEvmToAddressValidation';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getERC721AssetSymbol: Promise.resolve(undefined),
    },
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

const mockState = {
  state: evmSendStateMock,
};

interface ShouldSkipValidationArgs {
  toAddress?: string;
  chainId?: string;
  addressBook: AddressBookControllerState['addressBook'];
  internalAccounts: InternalAccount[];
}

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
  it('returns error if address is burn address', async () => {
    expect(
      await validateToAddress({
        toAddress: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [],
      }),
    ).toStrictEqual({ error: 'Invalid address' });

    expect(
      await validateToAddress({
        toAddress: '0x000000000000000000000000000000000000dead',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [],
      }),
    ).toStrictEqual({ error: 'Invalid address' });
  });
  it('returns warning if address is contract address', async () => {
    Engine.context.AssetsContractController.getERC721AssetSymbol = () =>
      Promise.resolve('ABC');
    expect(
      await validateToAddress({
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [],
      }),
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
    expect(
      await validateToAddress({
        toAddress: 'test.eth',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [
          {
            address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
          } as InternalAccount,
        ],
      }),
    ).toStrictEqual({
      error: "Couldn't resolve ENS",
    });
  });

  it('returns warning for confusables', async () => {
    jest
      .spyOn(ENSUtils, 'doENSLookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue('dummy_address' as any);
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    expect(
      await validateToAddress({
        toAddress: 'test.eth',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [
          {
            address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
          } as InternalAccount,
        ],
      }),
    ).toStrictEqual({
      warning:
        "We have detected a confusable character in the ENS name. Check the ENS name to avoid a potential scam. - 'ⅼ' is similar to 'l'",
      resolvedAddress: 'dummy_address',
    });
  });

  it('returns error and warning for confusables if it has hasZeroWidthPoints', async () => {
    jest
      .spyOn(ENSUtils, 'doENSLookup')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue('dummy_address' as any);
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    jest.spyOn(ConfusablesUtils, 'hasZeroWidthPoints').mockReturnValue(true);
    expect(
      await validateToAddress({
        toAddress: 'test.eth',
        chainId: '0x1',
        addressBook: {},
        internalAccounts: [
          {
            address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
          } as InternalAccount,
        ],
      }),
    ).toStrictEqual({
      warning:
        'We detected an invisible character in the ENS name. Check the ENS name to avoid a potential scam.',
      error: 'Invalid address',
      resolvedAddress: 'dummy_address',
    });
  });
});

describe('validatuseEvmToAddressValidationeEvmToAddress', () => {
  it('return function validateEvmToAddress', () => {
    const { result } = renderHookWithProvider(
      () => useEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateEvmToAddress).toBeDefined();
  });
});
