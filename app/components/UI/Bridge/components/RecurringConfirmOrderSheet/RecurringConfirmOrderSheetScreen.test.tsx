import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { createBridgeTestState } from '../../testUtils';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import {
  showRecurringAutoUpgradeError,
  submitRecurringOrder,
} from './RecurringConfirmOrderSheet.utils';
import { RecurringConfirmOrderSheetScreen } from './RecurringConfirmOrderSheetScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAutoUpgradeEIP7702Account = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      resetState: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  BridgeQuoteDataProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../hooks/useAutoUpgradeEIP7702Account', () => ({
  useAutoUpgradeEIP7702Account: jest.fn(),
}));

jest.mock('./RecurringConfirmOrderSheet.utils', () => ({
  showRecurringAutoUpgradeError: jest.fn(),
  submitRecurringOrder: jest.fn(),
}));

jest.mock('./RecurringConfirmOrderSheet', () => ({
  __esModule: true,
  default: ({
    isSubmitting,
    onConfirm,
    onEditSlippagePress,
    goBack,
  }: {
    isSubmitting: boolean;
    onConfirm: () => void;
    onEditSlippagePress: () => void;
    goBack: () => void;
  }) => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const { Pressable, Text } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(
        Pressable,
        { testID: 'confirm-order', onPress: onConfirm },
        ReactModule.createElement(
          Text,
          null,
          isSubmitting ? 'Submitting' : 'Confirm',
        ),
      ),
      ReactModule.createElement(
        Pressable,
        { testID: 'edit-slippage', onPress: onEditSlippagePress },
        ReactModule.createElement(Text, null, 'Edit slippage'),
      ),
      ReactModule.createElement(
        Pressable,
        { testID: 'close-confirm', onPress: goBack },
        ReactModule.createElement(Text, null, 'Close confirm'),
      ),
    );
  },
}));

const sourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

const destToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

const configuredRecurringState = {
  everyValue: '2',
  everyUnit: 'day' as const,
  repeatCount: '4',
  priceRange: {
    tokenSide: 'source' as const,
    currency: 'usd',
    min: '1000',
    max: '2000',
  },
};

function renderScreen(
  bridgeReducerOverrides: NonNullable<
    Parameters<typeof createBridgeTestState>[0]
  >['bridgeReducerOverrides'] = {},
) {
  return renderWithProvider(<RecurringConfirmOrderSheetScreen />, {
    state: createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken,
        destToken,
        ...bridgeReducerOverrides,
      },
    }),
  });
}

describe('RecurringConfirmOrderSheetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useAutoUpgradeEIP7702Account)
      .mockReturnValue(mockAutoUpgradeEIP7702Account);
    mockAutoUpgradeEIP7702Account.mockResolvedValue(undefined);
    jest.mocked(submitRecurringOrder).mockResolvedValue(undefined);
  });

  it('opens the shared slippage modal above the confirmation modal', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('edit-slippage'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken.chainId,
        destChainId: destToken.chainId,
      },
    });
  });

  it('passes modal navigation dismissal to the confirmation sheet', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('close-confirm'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('waits for auto-upgrade before submitting the recurring order', async () => {
    let resolveUpgrade: () => void = () => undefined;
    mockAutoUpgradeEIP7702Account.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpgrade = resolve;
        }),
    );
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    expect(mockAutoUpgradeEIP7702Account).toHaveBeenCalledWith();
    expect(submitRecurringOrder).not.toHaveBeenCalled();
    expect(getByTestId('confirm-order')).toHaveTextContent('Submitting');

    resolveUpgrade();

    await waitFor(() => {
      expect(submitRecurringOrder).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('resets shared market inputs while preserving recurring fields', async () => {
    const { getByTestId, store } = renderScreen({
      balanceRefreshKey: 3,
      destAmount: '10',
      isMaxSourceAmount: true,
      recurring: configuredRecurringState,
      selectedQuoteRequestId: 'quote-id',
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(store.getState().bridge).toEqual(
      expect.objectContaining({
        balanceRefreshKey: 4,
        destAmount: undefined,
        isMaxSourceAmount: false,
        recurring: configuredRecurringState,
        selectedQuoteRequestId: undefined,
        sourceAmount: undefined,
      }),
    );
  });

  it('surfaces upgrade failures without submitting or closing', async () => {
    const error = new Error('Upgrade failed');
    mockAutoUpgradeEIP7702Account.mockRejectedValue(error);
    const { getByTestId, store } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(showRecurringAutoUpgradeError).toHaveBeenCalledWith(error);
    });
    expect(submitRecurringOrder).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(store.getState().bridge.recurring).toEqual(configuredRecurringState);
    expect(store.getState().bridge.sourceAmount).toBe('1');
    expect(getByTestId('confirm-order')).toHaveTextContent('Confirm');
  });

  it('preserves recurring inputs when order submission fails', async () => {
    const error = new Error('Order submission failed');
    jest.mocked(submitRecurringOrder).mockRejectedValue(error);
    const { getByTestId, store } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(showRecurringAutoUpgradeError).toHaveBeenCalledWith(error);
    });
    expect(store.getState().bridge.recurring).toEqual(configuredRecurringState);
    expect(store.getState().bridge.sourceAmount).toBe('1');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('ignores duplicate confirmation presses', async () => {
    mockAutoUpgradeEIP7702Account.mockReturnValue(
      new Promise<void>(() => undefined),
    );
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));
    fireEvent.press(getByTestId('confirm-order'));

    expect(mockAutoUpgradeEIP7702Account).toHaveBeenCalledTimes(1);
  });

  it('does not open the transaction confirmation modal', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(submitRecurringOrder).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.CONFIRMATION_REQUEST_MODAL,
    );
  });
});
