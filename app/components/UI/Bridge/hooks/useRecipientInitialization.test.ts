import '../_mocks_/initialState';
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../testUtils';
import { useRecipientInitialization } from './useRecipientInitialization';
import { useDestinationAccounts } from './useDestinationAccounts';

jest.mock('./useDestinationAccounts', () => ({
  useDestinationAccounts: jest.fn(),
}));

const mockUseDestinationAccounts = jest.mocked(useDestinationAccounts);

const INTERNAL_EVM_ADDRESS = '0x1234567890123456789012345678901234567890';
const EXTERNAL_EVM_ADDRESS = '0x9999999999999999999999999999999999999999';

const evmDestinationAccount = {
  id: 'evm-account-1',
  address: INTERNAL_EVM_ADDRESS,
  caipAccountId: `eip155:1:${INTERNAL_EVM_ADDRESS}`,
};

const evmDestToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  chainId: '0x1',
  name: 'Ethereum',
};

const renderRecipientInitializationHook = (
  state: ReturnType<typeof createBridgeTestState>,
) =>
  renderHookWithProvider(
    () => {
      const hasInitializedRecipient = React.useRef(false);
      useRecipientInitialization(hasInitializedRecipient);
      return hasInitializedRecipient.current;
    },
    { state },
  );

describe('useRecipientInitialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDestinationAccounts.mockReturnValue({
      destinationAccounts: [evmDestinationAccount],
    } as ReturnType<typeof useDestinationAccounts>);
  });

  it('preserves an external EVM destination address', async () => {
    const state = createBridgeTestState({
      bridgeReducerOverrides: {
        destToken: evmDestToken,
        destAddress: EXTERNAL_EVM_ADDRESS,
      },
    });

    const { store } = renderRecipientInitializationHook(state);

    await waitFor(() => {
      expect(store.getState().bridge.destAddress).toBe(EXTERNAL_EVM_ADDRESS);
    });
  });

  it('initializes destination address when it is missing', async () => {
    const state = createBridgeTestState({
      bridgeReducerOverrides: {
        destToken: evmDestToken,
        destAddress: undefined,
      },
    });

    const { store } = renderRecipientInitializationHook(state);

    await waitFor(() => {
      expect(store.getState().bridge.destAddress).toBe(INTERNAL_EVM_ADDRESS);
    });
  });
});
