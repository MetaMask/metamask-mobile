import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { setSourceAmount } from '../../../../../core/redux/slices/bridge';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { showRecurringAutoUpgradeError } from '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils';
import { BridgeViewMode, type BridgeToken } from '../../types';
import { BridgeTabKey } from '../BridgeView/BridgeView.constants';
import {
  RecurringSwapAgainButton,
  RecurringSwapDelegationButton,
} from './RecurringSwapDetailsView';
import { RecurringSwapDetailsViewSelectorsIDs } from './RecurringSwapDetailsView.testIds';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockSetSelectedTab = jest.fn();
const mockSetRenderedTab = jest.fn();
jest.mock('../../hooks/useBridgeSession', () => ({
  useBridgeSession: () => ({
    setSelectedTab: mockSetSelectedTab,
    setRenderedTab: mockSetRenderedTab,
  }),
}));

jest.mock('../../utils/swapBridgePageLoadTrace', () => ({
  startSwapBridgePageLoadTrace: (route: Record<string, unknown>) => ({
    ...route,
    swapViewTraceId: 'test-trace-id',
  }),
}));

jest.mock('../../hooks/useAutoUpgradeEIP7702Account', () => ({
  useAutoUpgradeEIP7702Account: jest.fn(),
}));

jest.mock(
  '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils',
  () => ({
    showRecurringAutoUpgradeError: jest.fn(),
  }),
);

const mockAutoUpgradeEIP7702Account = jest.fn();
const mockGetUpgradeStatus = jest.fn();
const DELEGATE_ACCOUNT_LABEL = strings(
  'bridge.recurring.delegate_your_account',
);
const SOURCE_TOKEN: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 'eip155:1',
  decimals: 18,
  symbol: 'ETH',
};
const DESTINATION_TOKEN: BridgeToken = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: 'eip155:1',
  decimals: 6,
  symbol: 'USDC',
};

function renderDelegationButton() {
  return renderWithProvider(
    <RecurringSwapDelegationButton
      address="0x1234567890123456789012345678901234567890"
      chainId="eip155:1"
    />,
    {},
  );
}

describe('RecurringSwapAgainButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Unified Swaps on the Market tab with tokens and no amount', () => {
    const renderResult = renderWithProvider(
      <RecurringSwapAgainButton
        sourceToken={SOURCE_TOKEN}
        destinationToken={DESTINATION_TOKEN}
      />,
      {},
    );

    fireEvent.press(
      renderResult.getByText(strings('activity_details.swap_again')),
    );

    expect(mockDispatch).toHaveBeenCalledWith(setSourceAmount(undefined));
    expect(mockSetSelectedTab).toHaveBeenCalledWith(BridgeTabKey.Market);
    expect(mockSetRenderedTab).toHaveBeenCalledWith(BridgeTabKey.Market);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
      screen: Routes.BRIDGE.BRIDGE_VIEW,
      params: expect.objectContaining({
        sourcePage: 'RecurringSwapDetails',
        bridgeViewMode: BridgeViewMode.Unified,
        sourceToken: SOURCE_TOKEN,
        destToken: DESTINATION_TOKEN,
        location: MetaMetricsSwapsEventSource.TransactionDetails,
        scrollToTopOnNav: true,
      }),
    });
    expect(mockNavigate.mock.calls[0][1].params).not.toHaveProperty(
      'sourceAmount',
    );
  });
});

describe('RecurringSwapDelegationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAutoUpgradeEIP7702Account).mockReturnValue({
      autoUpgradeEIP7702Account: mockAutoUpgradeEIP7702Account,
      getUpgradeStatus: mockGetUpgradeStatus,
    });
    mockAutoUpgradeEIP7702Account.mockResolvedValue(undefined);
  });

  it('shows loading until delegation eligibility is known', async () => {
    let resolveStatus:
      | ((status: { isUpgradeRequired: true }) => void)
      | undefined;
    mockGetUpgradeStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const renderResult = renderDelegationButton();

    expect(useAutoUpgradeEIP7702Account).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      chainId: 'eip155:1',
    });
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ).props.accessibilityState?.disabled,
    ).toBe(true);

    await act(async () => {
      resolveStatus?.({ isUpgradeRequired: true });
    });

    expect(renderResult.getByText(DELEGATE_ACCOUNT_LABEL)).toBeOnTheScreen();
  });

  it('hides the action when the account is already delegated', async () => {
    mockGetUpgradeStatus.mockResolvedValue({ isUpgradeRequired: false });
    const renderResult = renderDelegationButton();

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  it('hides the action after delegation succeeds', async () => {
    let resolveUpgrade: (() => void) | undefined;
    mockGetUpgradeStatus.mockResolvedValue({ isUpgradeRequired: true });
    mockAutoUpgradeEIP7702Account.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpgrade = resolve;
      }),
    );
    const renderResult = renderDelegationButton();
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
        ).props.accessibilityState?.disabled,
      ).toBe(false);
    });

    fireEvent.press(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ),
    );

    expect(mockAutoUpgradeEIP7702Account).toHaveBeenCalledTimes(1);
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ).props.accessibilityState?.disabled,
    ).toBe(true);

    await act(async () => {
      resolveUpgrade?.();
    });

    expect(
      renderResult.queryByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('restores the action when delegation fails', async () => {
    const error = new Error('Upgrade failed');
    mockGetUpgradeStatus.mockResolvedValue({ isUpgradeRequired: true });
    mockAutoUpgradeEIP7702Account.mockRejectedValue(error);
    const renderResult = renderDelegationButton();

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
        ).props.accessibilityState?.disabled,
      ).toBe(false);
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(showRecurringAutoUpgradeError).toHaveBeenCalledWith(error);
    });
    expect(renderResult.getByText(DELEGATE_ACCOUNT_LABEL)).toBeOnTheScreen();
    expect(
      renderResult.getByTestId(
        RecurringSwapDetailsViewSelectorsIDs.DELEGATE_ACCOUNT_BUTTON,
      ).props.accessibilityState?.disabled,
    ).toBe(false);
  });
});
