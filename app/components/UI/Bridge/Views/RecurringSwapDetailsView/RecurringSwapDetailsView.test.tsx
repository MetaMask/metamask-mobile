import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { showRecurringAutoUpgradeError } from '../../components/RecurringConfirmOrderSheet/RecurringConfirmOrderSheet.utils';
import { RecurringSwapDelegationButton } from './RecurringSwapDetailsView';
import { RecurringSwapDetailsViewSelectorsIDs } from './RecurringSwapDetailsView.testIds';

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

function renderDelegationButton() {
  return renderWithProvider(
    <RecurringSwapDelegationButton
      address="0x1234567890123456789012345678901234567890"
      chainId="eip155:1"
    />,
    {},
  );
}

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
