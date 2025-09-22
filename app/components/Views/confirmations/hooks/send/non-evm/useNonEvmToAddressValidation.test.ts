import { AddressResolution } from '@metamask/snaps-sdk';
import { InternalAccount } from '@metamask/keyring-internal-api';

import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as SnapNameResolution from '../../../../../Snaps/hooks/useSnapNameResolution';
// eslint-disable-next-line import/no-namespace
import * as SendUtils from '../../../utils/send';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSendContext } from '../../../context/send-context';
import {
  shouldSkipValidation,
  useNonEvmToAddressValidation,
  validateToAddress,
} from './useNonEvmToAddressValidation';

jest.mock('../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

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
  it('returns error if send is of type solana and address is not solana address', async () => {
    expect(
      validateToAddress({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        internalAccounts: [],
        isSolanaSendType: true,
        toAddress: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        loading: false,
        resolutionResult: [],
      }),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });

  it('does not returns error if address is solana address', async () => {
    expect(
      validateToAddress({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        internalAccounts: [],
        isSolanaSendType: true,
        toAddress: '14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5',
        loading: false,
        resolutionResult: [],
      }),
    ).toStrictEqual({});
  });
});

describe('useSolanaToAddressValidation', () => {
  it('return fields for to address error and warning', () => {
    mockUseSendContext.mockReturnValue({
      to: '4Nd1mY5U4Q5oLQjk5L3dhuRvhXcH2vCn2EDqjz9qZ3W4',
    } as unknown as ReturnType<typeof useSendContext>);
    const { result } = renderHookWithProvider(
      () => useNonEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmToAddress).toBeDefined();
  });

  it('return resolved address when name is resolved', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      results: [
        { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
      ],
      loading: false,
    });
    const { result } = renderHookWithProvider(
      () => useNonEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmToAddress()).toStrictEqual({
      resolvedAddress: 'dummy_address',
      toAddressValidated: 'test.sol',
    });
  });

  it('return confusable error and warning as name is resolved', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest.spyOn(SendUtils, 'getConfusableCharacterInfo').mockReturnValue({
      error: 'dummy_error',
      warning: 'dummy_warning',
    });
    jest.spyOn(SnapNameResolution, 'useSnapNameResolution').mockReturnValue({
      results: [
        { resolvedAddress: 'dummy_address' } as unknown as AddressResolution,
      ],
      loading: false,
    });
    const { result } = renderHookWithProvider(
      () => useNonEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmToAddress()).toStrictEqual({
      error: 'dummy_error',
      warning: 'dummy_warning',
      resolvedAddress: 'dummy_address',
      toAddressValidated: 'test.sol',
    });
  });

  it('return loading as true when resolving name', async () => {
    mockUseSendContext.mockReturnValue({
      chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      to: 'test.sol',
    } as unknown as ReturnType<typeof useSendContext>);
    jest
      .spyOn(SnapNameResolution, 'useSnapNameResolution')
      .mockReturnValue({ results: [], loading: true });
    const { result } = renderHookWithProvider(
      () => useNonEvmToAddressValidation(),
      mockState,
    );
    expect(result.current.validateNonEvmToAddress()).toStrictEqual({
      loading: true,
      toAddressValidated: 'test.sol',
    });
  });
});
