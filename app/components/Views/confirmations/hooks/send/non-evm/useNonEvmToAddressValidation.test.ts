import { InternalAccount } from '@metamask/keyring-internal-api';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import {
  shouldSkipValidation,
  useNonEvmToAddressValidation,
  validateToAddress,
} from './useNonEvmToAddressValidation';

const mockState = {
  state: evmSendStateMock,
};

interface ShouldSkipValidationArgs {
  toAddress?: string;
  chainId?: string;
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
  it('returns error if address is not solana address', async () => {
    expect(
      validateToAddress(
        [],
        '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });

  it('does not returns error if address is solana address', async () => {
    expect(
      validateToAddress(
        [],
        '14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ),
    ).toStrictEqual({});
  });
});

describe('useSolanaToAddressValidation', () => {
  it('return fields for to address error and warning', () => {
    const { result } = renderHookWithProvider(
      () => useNonEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmToAddress).toBeDefined();
  });
});
