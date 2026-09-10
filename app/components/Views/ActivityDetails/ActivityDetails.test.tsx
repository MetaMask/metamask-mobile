import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import renderWithProvider from '../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../util/activity-adapters';
import { strings } from '../../../../locales/i18n';
import ActivityDetails from './ActivityDetails';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
// eslint-disable-next-line import-x/no-restricted-paths -- same query the screen uses
import { useTransactionsQuery } from '../ActivityList/useTransactionsQuery';
import { useParams } from '../../../util/navigation/navUtils';
// eslint-disable-next-line import-x/no-restricted-paths -- test controls the shared speed-up/cancel actions hook
import { useUnifiedTxActions } from '../ActivityList/useUnifiedTxActions';
import { selectPerpsEnabledFlag } from '#app/components/UI/Perps/selectors/featureFlags';
import { usePerpsDetailsItem } from '#app/components/Views/ActivityDetails/templates/Perps/usePerpsDetailsItem';

const mockGoBack = jest.fn();
const mockIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useIsFocused: () => mockIsFocused(),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('./hooks/useActivityDetailsItem', () => ({
  useActivityDetailsItem: jest.fn(),
}));

jest.mock('../ActivityList/useTransactionsQuery', () => ({
  useTransactionsQuery: jest.fn(() => ({
    data: { pages: [{ data: [] }] },
    isPending: false,
    isFetching: false,
  })),
}));

// The title resolves the bridge quote via this selector; the screen test uses a
// minimal store, so stub it to an empty history (bridge-title behaviour is
// covered by the row-content tests).
jest.mock('../../../selectors/bridgeStatusController', () => ({
  ...jest.requireActual('../../../selectors/bridgeStatusController'),
  selectBridgeHistoryForAccount: () => ({}),
}));

// Focus on screen behaviour; the template dispatch is covered separately.
jest.mock('./templates/TemplateLoader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    TemplateLoader: () =>
      ReactActual.createElement(View, { testID: 'mock-template-loader' }),
  };
});

// Speed-up / cancel pull in the hardware-wallet + navigation chain; the screen
// test controls the hook per-test. Behaviour is covered in the hook + banner
// tests.
jest.mock('../ActivityList/useUnifiedTxActions', () => ({
  useUnifiedTxActions: jest.fn(),
}));

jest.mock('#app/components/UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn(() => false),
}));

jest.mock(
  '#app/components/Views/ActivityDetails/templates/PerpsDetails',
  () => ({
    PerpsDetailsProviders: ({ children }: { children: React.ReactNode }) =>
      children,
  }),
);

jest.mock(
  '#app/components/Views/ActivityDetails/templates/Perps/usePerpsDetailsItem',
  () => ({
    usePerpsDetailsItem: jest.fn(() => ({
      item: undefined,
      transaction: undefined,
      isLoading: false,
    })),
  }),
);

jest.mock(
  '#app/components/Views/ActivityDetails/templates/PredictDetails/usePredictDetailsItem',
  () => ({
    usePredictDetailsItem: jest.fn(() => ({
      item: undefined,
      isLoading: false,
    })),
  }),
);

// Expose the modal's onConfirm so a test can simulate the user confirming a
// speed-up/cancel on this screen.
jest.mock('../confirmations/components/modals/cancel-speedup-modal', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    CancelSpeedupModal: ({ onConfirm }: { onConfirm: () => void }) =>
      ReactActual.createElement(TouchableOpacity, {
        testID: 'mock-speedup-cancel-confirm',
        onPress: () => onConfirm(),
      }),
  };
});

const useParamsMock = jest.mocked(useParams);
const useActivityDetailsItemMock = jest.mocked(useActivityDetailsItem);
const useTransactionsQueryMock = jest.mocked(useTransactionsQuery);
const useUnifiedTxActionsMock = jest.mocked(useUnifiedTxActions);
const selectPerpsEnabledFlagMock = jest.mocked(selectPerpsEnabledFlag);
const usePerpsDetailsItemMock = jest.mocked(usePerpsDetailsItem);

const buildTxActions = (
  overrides: Partial<ReturnType<typeof useUnifiedTxActions>> = {},
): ReturnType<typeof useUnifiedTxActions> =>
  ({
    speedUpIsOpen: false,
    cancelIsOpen: false,
    confirmDisabled: false,
    existingTx: null,
    isLedgerAccount: false,
    isQRHardwareAccount: false,
    onSpeedUpAction: jest.fn(),
    onCancelAction: jest.fn(),
    onSpeedUpCancelCompleted: jest.fn(),
    speedUpTransaction: jest.fn(() => Promise.resolve()),
    cancelTransaction: jest.fn(() => Promise.resolve()),
    signQRTransaction: jest.fn(),
    signLedgerTransaction: jest.fn(),
    cancelUnsignedQRTransaction: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useUnifiedTxActions>;

const pendingTx = { id: 'tx-1' } as unknown as TransactionMeta;

const sendItem: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: { from: '0xfrom', to: '0xto' },
} as ActivityListItem;

const arbitrumSendItem: ActivityListItem = {
  ...sendItem,
  chainId: 'eip155:42161',
  hash: '0xdeposit',
};

const perpsFundsItem: ActivityListItem = {
  type: 'perpsAddFunds',
  chainId: 'eip155:42161',
  status: 'success',
  timestamp: 1,
  hash: '0xdeposit',
  data: {
    token: { amount: '1000', decimals: 6, direction: 'in', symbol: 'USDC' },
  },
} as ActivityListItem;

describe('ActivityDetails screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionsQueryMock.mockReturnValue({
      data: { pages: [{ data: [] }] },
      isPending: false,
      isFetching: false,
    } as unknown as ReturnType<typeof useTransactionsQuery>);
    mockIsFocused.mockReturnValue(true);
    useParamsMock.mockReturnValue({
      chainId: 'eip155:1',
      txIdentifier: '0xhash',
    });
    useUnifiedTxActionsMock.mockReturnValue(buildTxActions());
    selectPerpsEnabledFlagMock.mockReturnValue(false);
  });

  it('renders the template when the transaction resolves', () => {
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.SCREEN)).toBeOnTheScreen();
    expect(getByTestId('mock-template-loader')).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
  });

  it('renders a not-found message when the transaction cannot be resolved', () => {
    useActivityDetailsItemMock.mockReturnValue(undefined);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND),
    ).toBeOnTheScreen();
    expect(queryByTestId('mock-template-loader')).toBeNull();
  });

  it('returns to the list after a confirmed speed-up/cancel once the transaction is replaced', () => {
    useUnifiedTxActionsMock.mockReturnValue(
      buildTxActions({ existingTx: pendingTx, speedUpIsOpen: true }),
    );
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, rerender } = renderWithProvider(<ActivityDetails />);

    // User confirms the speed-up/cancel on this screen (arms the auto-dismiss).
    fireEvent.press(getByTestId('mock-speedup-cancel-confirm'));

    // Replacement commits: the original tx is dropped and no longer resolves.
    useActivityDetailsItemMock.mockReturnValue(undefined);
    rerender(<ActivityDetails />);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss when the item disappears without a speed-up/cancel (pending→confirmed flip)', () => {
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { rerender } = renderWithProvider(<ActivityDetails />);

    // No confirm; the item vanishes on the id→hash flip.
    useActivityDetailsItemMock.mockReturnValue(undefined);
    rerender(<ActivityDetails />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not auto-dismiss when the action fails and the transaction still resolves', () => {
    useUnifiedTxActionsMock.mockReturnValue(
      buildTxActions({ existingTx: pendingTx, speedUpIsOpen: true }),
    );
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, rerender } = renderWithProvider(<ActivityDetails />);

    fireEvent.press(getByTestId('mock-speedup-cancel-confirm'));

    // Action failed: tx not replaced, item still resolves.
    useActivityDetailsItemMock.mockReturnValue(sendItem);
    rerender(<ActivityDetails />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not auto-dismiss for QR hardware accounts (signing route must not be popped)', () => {
    useUnifiedTxActionsMock.mockReturnValue(
      buildTxActions({
        existingTx: pendingTx,
        speedUpIsOpen: true,
        isQRHardwareAccount: true,
      }),
    );
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, rerender } = renderWithProvider(<ActivityDetails />);

    fireEvent.press(getByTestId('mock-speedup-cancel-confirm'));
    useActivityDetailsItemMock.mockReturnValue(undefined);
    rerender(<ActivityDetails />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not auto-dismiss when the screen is not focused (user navigated forward)', () => {
    useUnifiedTxActionsMock.mockReturnValue(
      buildTxActions({ existingTx: pendingTx, speedUpIsOpen: true }),
    );
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, rerender } = renderWithProvider(<ActivityDetails />);

    fireEvent.press(getByTestId('mock-speedup-cancel-confirm'));

    // The screen is backgrounded (another screen pushed on top) when the
    // replacement commits — goBack must not pop whatever is now on top.
    mockIsFocused.mockReturnValue(false);
    useActivityDetailsItemMock.mockReturnValue(undefined);
    rerender(<ActivityDetails />);

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('prefers rematched perps funds over a same-hash send', () => {
    selectPerpsEnabledFlagMock.mockReturnValue(true);
    useActivityDetailsItemMock.mockReturnValue(arbitrumSendItem);
    usePerpsDetailsItemMock.mockReturnValue({
      item: perpsFundsItem,
      transaction: undefined,
      isLoading: false,
    });
    useParamsMock.mockReturnValue({
      chainId: 'eip155:42161',
      txIdentifier: '0xdeposit',
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.HEADER)).toHaveTextContent(
      strings('transactions.activity_perps_account_funded'),
    );
    expect(getByTestId('mock-template-loader')).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
  });

  it('does not flash not-found while rematch is still loading', () => {
    useActivityDetailsItemMock.mockReturnValue(undefined);
    useTransactionsQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
    } as unknown as ReturnType<typeof useTransactionsQuery>);

    const { queryByTestId } = renderWithProvider(<ActivityDetails />);

    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
    expect(queryByTestId('mock-template-loader')).toBeNull();
  });
});
