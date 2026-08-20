import React from 'react';
import { Linking, Share } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FileShare from 'react-native-share';
import ReferralRevenueShareDashboard, {
  setClaimingEnabled,
} from './ReferralRevenueShareDashboard';
import ClipboardManager from '../../../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  Theme: { Light: 'light', Dark: 'dark' },
  useTailwind: () => {
    const tw = (..._args: unknown[]) => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
  useTheme: () => 'light',
}));

jest.mock('react-native-qrcode-svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      getRef,
    }: {
      getRef?: (ref: {
        toDataURL: (callback: (data: string) => void) => void;
      }) => void;
    }) => {
      getRef?.({ toDataURL: (callback) => callback('MOCK_QR_DATA') });
      return ReactActual.createElement(View, { testID: 'qr-code' });
    },
  };
});

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

jest.mock('../../../../../images/rewards/referral-share-hero.png', () => 1);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../Money/components/MoneyEarnings', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'money-earnings' }),
  };
});

const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

const renderDashboard = (mode?: 'overview' | 'performance') =>
  render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ReferralRevenueShareDashboard mode={mode} />
    </ToastContext.Provider>,
  );

const flushInvitedNewUserDismiss = () => {
  act(() => {
    jest.advanceTimersByTime(350);
  });
};

const openClaimSheet = () => {
  setClaimingEnabled(true);
  renderDashboard('performance');
  fireEvent.press(screen.getByTestId('referral-claim-button'));
};

const openClaimReview = () => {
  openClaimSheet();
  fireEvent.press(screen.getByTestId('confirm-referral-claim-button'));
};

describe('ReferralRevenueShareDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setClaimingEnabled(false);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('copies referral code to clipboard when copy button is pressed', async () => {
    renderDashboard();

    await act(async () => {
      fireEvent.press(screen.getByTestId('copy-referral-code-button'));
    });

    expect(jest.mocked(ClipboardManager.setString)).toHaveBeenCalledWith(
      '8F3A21',
    );
  });

  it('shows toast with referral code copied label when copy button is pressed', async () => {
    renderDashboard();

    await act(async () => {
      fireEvent.press(screen.getByTestId('copy-referral-code-button'));
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: ToastVariants.Plain,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: 'rewards.referral.referral_code_copied',
          isBold: true,
        },
      ],
    });
  });

  it('shows copied accessibility label after copy button is pressed', async () => {
    renderDashboard();

    await act(async () => {
      fireEvent.press(screen.getByTestId('copy-referral-code-button'));
    });

    expect(screen.getByTestId('copy-referral-code-button')).toHaveProp(
      'accessibilityLabel',
      'Referral code copied',
    );
    expect(screen.getByTestId('copy-referral-code-button')).toBeOnTheScreen();
  });

  describe('prototype scenarios', () => {
    it('auto-opens the prototype scenarios sheet in overview mode', () => {
      renderDashboard();

      expect(screen.getByText('Prototype Scenarios')).toBeOnTheScreen();
      expect(
        screen.getByTestId('prototype-scenario-onboarded-kol'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('prototype-scenario-ineligible-user'),
      ).toBeOnTheScreen();
    });

    it('does not auto-open the prototype scenarios sheet in performance mode', () => {
      renderDashboard('performance');

      expect(screen.queryByText('Prototype Scenarios')).not.toBeOnTheScreen();
    });

    it('closes the sheet when Onboarded KOL is selected', () => {
      renderDashboard();

      fireEvent.press(screen.getByTestId('prototype-scenario-onboarded-kol'));

      expect(screen.queryByText('Prototype Scenarios')).not.toBeOnTheScreen();
    });

    it('opens the invited new user full-page screen when that scenario is selected', () => {
      renderDashboard();

      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      );

      expect(screen.queryByText('Prototype Scenarios')).not.toBeOnTheScreen();
      expect(screen.getByTestId('invited-new-user-screen')).toBeOnTheScreen();
      expect(screen.getByText("You've been referred")).toBeOnTheScreen();
      expect(
        screen.queryByTestId('invited-existing-user-sheet'),
      ).not.toBeOnTheScreen();
      expect(screen.getByText(/Tap Accept to confirm/)).toBeOnTheScreen();
      expect(
        screen.getByTestId('invited-new-user-referral-code-input'),
      ).toHaveTextContent(/8F3A21/);
      expect(screen.getByTestId('edit-referral-code-button')).toBeOnTheScreen();
      expect(screen.getByText('Use a different code')).toBeOnTheScreen();
      expect(
        screen.getByTestId('invited-new-user-back-button'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByLabelText('Referral invite illustration'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('decline-invited-new-user-button'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('accept-invited-new-user-button'),
      ).toBeOnTheScreen();
    });

    it('edits the referral code on the invited new user screen after edit is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      );

      fireEvent.press(screen.getByTestId('edit-referral-code-button'));
      fireEvent.changeText(
        screen.getByTestId('invited-new-user-referral-code-input'),
        'ab12cd',
      );

      expect(screen.getByDisplayValue('AB12CD')).toBeOnTheScreen();
      expect(screen.getByDisplayValue('AB12CD')).toHaveProp('editable', true);
      expect(
        screen.queryByTestId('edit-referral-code-button'),
      ).not.toBeOnTheScreen();
    });

    it('dismisses the invited new user screen when the back button is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      );

      fireEvent.press(screen.getByTestId('invited-new-user-back-button'));
      flushInvitedNewUserDismiss();

      expect(
        screen.queryByTestId('invited-new-user-screen'),
      ).not.toBeOnTheScreen();
    });

    it('dismisses the invited new user screen when decline is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      );

      fireEvent.press(screen.getByTestId('decline-invited-new-user-button'));
      flushInvitedNewUserDismiss();

      expect(
        screen.queryByTestId('invited-new-user-screen'),
      ).not.toBeOnTheScreen();
    });

    it('dismisses the invited new user screen when accept is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-new-user'),
      );

      fireEvent.press(screen.getByTestId('accept-invited-new-user-button'));
      flushInvitedNewUserDismiss();

      expect(
        screen.queryByTestId('invited-new-user-screen'),
      ).not.toBeOnTheScreen();
    });

    it('opens the invited existing user sheet when that scenario is selected', () => {
      renderDashboard();

      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      expect(screen.queryByText('Prototype Scenarios')).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('invited-existing-user-sheet'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('invited-new-user-screen'),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('Referral invite')).toBeOnTheScreen();
      expect(screen.getByText(/Tap Accept to confirm/)).toBeOnTheScreen();
      expect(
        screen.queryByLabelText('Referral invite illustration'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('invited-existing-user-referral-code-input'),
      ).toHaveTextContent(/8F3A21/);
      expect(screen.getByTestId('edit-referral-code-button')).toBeOnTheScreen();
      expect(screen.getByText('Use a different code')).toBeOnTheScreen();
      expect(
        screen.getByTestId('decline-invited-existing-user-button'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('accept-invited-existing-user-button'),
      ).toBeOnTheScreen();
    });

    it('requires accept or decline on the invited existing user sheet', () => {
      renderDashboard();

      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      expect(
        screen.queryByTestId('close-invited-existing-user-button'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('decline-invited-existing-user-button'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('accept-invited-existing-user-button'),
      ).toBeOnTheScreen();
    });

    it('keeps the referral code field reserved height when edit is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );
      const codeField = screen.getByTestId('referral-invite-code-field');

      fireEvent(codeField, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 84 } },
      });

      expect(codeField).not.toHaveStyle({ minHeight: 84 });

      fireEvent.press(screen.getByTestId('edit-referral-code-button'));

      expect(screen.getByTestId('referral-invite-code-field')).toHaveStyle({
        minHeight: 84,
      });
    });

    it('edits the referral code on the invited existing user sheet after edit is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      fireEvent.press(screen.getByTestId('edit-referral-code-button'));
      fireEvent.changeText(
        screen.getByTestId('invited-existing-user-referral-code-input'),
        'ab12cd',
      );

      expect(screen.getByDisplayValue('AB12CD')).toBeOnTheScreen();
      expect(screen.getByDisplayValue('AB12CD')).toHaveProp('editable', true);
      expect(
        screen.queryByTestId('edit-referral-code-button'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('referral-code-complete-icon'),
      ).toBeOnTheScreen();
    });

    it('shows a cancel action when the referral code field becomes editable', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      fireEvent.press(screen.getByTestId('edit-referral-code-button'));

      expect(
        screen.getByTestId('cancel-referral-code-button'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('referral-code-complete-icon'),
      ).not.toBeOnTheScreen();
    });

    it('restores the uneditable referral code when cancel is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );
      fireEvent.press(screen.getByTestId('edit-referral-code-button'));
      fireEvent.changeText(
        screen.getByTestId('invited-existing-user-referral-code-input'),
        'ab',
      );

      fireEvent.press(screen.getByTestId('cancel-referral-code-button'));

      expect(
        screen.getByTestId('invited-existing-user-referral-code-input'),
      ).toHaveTextContent(/8F3A21/);
      expect(screen.getByTestId('edit-referral-code-button')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('cancel-referral-code-button'),
      ).not.toBeOnTheScreen();
    });

    it('restores the original referral code when the field is cleared and left empty', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );
      fireEvent.press(screen.getByTestId('edit-referral-code-button'));
      fireEvent.changeText(
        screen.getByTestId('invited-existing-user-referral-code-input'),
        '',
      );

      fireEvent(screen.getByDisplayValue(''), 'blur');

      expect(
        screen.getByTestId('invited-existing-user-referral-code-input'),
      ).toHaveTextContent(/8F3A21/);
      expect(screen.getByTestId('edit-referral-code-button')).toBeOnTheScreen();
    });

    it('shows a success check after a 6 character referral code is entered', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );
      fireEvent.press(screen.getByTestId('edit-referral-code-button'));

      fireEvent.changeText(
        screen.getByTestId('invited-existing-user-referral-code-input'),
        'xy98zt',
      );

      expect(
        screen.getByTestId('referral-code-complete-icon'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('cancel-referral-code-button'),
      ).not.toBeOnTheScreen();
    });

    it('dismisses the invited existing user sheet when decline is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      fireEvent.press(
        screen.getByTestId('decline-invited-existing-user-button'),
      );

      expect(
        screen.queryByTestId('invited-existing-user-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('dismisses the invited existing user sheet when accept is pressed', () => {
      renderDashboard();
      fireEvent.press(
        screen.getByTestId('prototype-scenario-invited-existing-user'),
      );

      fireEvent.press(
        screen.getByTestId('accept-invited-existing-user-button'),
      );

      expect(
        screen.queryByTestId('invited-existing-user-sheet'),
      ).not.toBeOnTheScreen();
      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: expect.any(String),
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        labelOptions: [
          {
            label: 'Referral accepted',
            isBold: true,
          },
        ],
      });
    });

    it('navigates home and shows an unavailable toast when Ineligible user is selected', () => {
      renderDashboard();

      fireEvent.press(screen.getByTestId('prototype-scenario-ineligible-user'));

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Info,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: "This referral isn't available",
            isBold: true,
          },
        ],
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('reopens the sheet when the scenarios button is pressed', () => {
      renderDashboard();
      fireEvent.press(screen.getByTestId('prototype-scenario-onboarded-kol'));
      expect(screen.queryByText('Prototype Scenarios')).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('open-prototype-scenarios-button'));

      expect(screen.getByText('Prototype Scenarios')).toBeOnTheScreen();
    });

    describe('enable claiming toggle', () => {
      it('shows the toggle under the Onboarded KOL scenario', () => {
        renderDashboard();

        expect(screen.getByTestId('enable-claiming-toggle')).toBeOnTheScreen();
      });

      it('hides the claim footer on the earnings screen by default', () => {
        renderDashboard('performance');

        expect(
          screen.queryByTestId('referral-claim-button'),
        ).not.toBeOnTheScreen();
      });

      it('shows the claim footer on the earnings screen once claiming is enabled via the toggle', () => {
        const { unmount } = renderDashboard();

        act(() => {
          fireEvent(
            screen.getByTestId('enable-claiming-toggle'),
            'onValueChange',
            true,
          );
        });
        unmount();

        renderDashboard('performance');

        expect(screen.getByTestId('referral-claim-button')).toBeOnTheScreen();
      });

      it('hides the claim footer again after the toggle is switched off', () => {
        const { unmount: unmountFirst } = renderDashboard();
        act(() => {
          fireEvent(
            screen.getByTestId('enable-claiming-toggle'),
            'onValueChange',
            true,
          );
        });
        unmountFirst();

        const { unmount: unmountSecond } = renderDashboard();
        act(() => {
          fireEvent(
            screen.getByTestId('enable-claiming-toggle'),
            'onValueChange',
            false,
          );
        });
        unmountSecond();

        renderDashboard('performance');

        expect(
          screen.queryByTestId('referral-claim-button'),
        ).not.toBeOnTheScreen();
      });
    });
  });

  describe('claim review', () => {
    it('shows gross-to-net review after continue is pressed', () => {
      openClaimReview();

      expect(screen.getByText('Review claim')).toBeOnTheScreen();
      expect(screen.getByText("You'll receive")).toBeOnTheScreen();
      expect(screen.getByText('Gross')).toBeOnTheScreen();
      expect(screen.getByText('Money Account')).toBeOnTheScreen();
      expect(screen.getByText('1–2 business days')).toBeOnTheScreen();
    });

    it('shows info tooltips on withholding, fee, and expected delivery', () => {
      openClaimReview();

      expect(screen.getByLabelText('Withholding tooltip')).toBeOnTheScreen();
      expect(screen.getByLabelText('Fee tooltip')).toBeOnTheScreen();
      expect(
        screen.getByLabelText('Expected delivery tooltip'),
      ).toBeOnTheScreen();
    });

    it('shows claim submitted after confirm claim is pressed', () => {
      openClaimReview();

      fireEvent.press(screen.getByTestId('submit-referral-claim-button'));

      expect(screen.getByText('Claim submitted')).toBeOnTheScreen();
    });

    it('returns to claim earnings after back is pressed on review', () => {
      openClaimReview();

      fireEvent.press(screen.getByTestId('claim-review-back-button'));

      expect(screen.getByText('Claim earnings')).toBeOnTheScreen();
      expect(screen.queryByText('Review claim')).not.toBeOnTheScreen();
    });

    it('dismisses the sheet after close is pressed on review', () => {
      openClaimReview();

      fireEvent.press(screen.getByTestId('close-claim-sheet-button'));

      expect(screen.queryByText('Review claim')).not.toBeOnTheScreen();
    });
  });

  describe('overview share', () => {
    it('shares the referral link with a compensation disclosure', async () => {
      const shareSpy = jest
        .spyOn(Share, 'share')
        .mockResolvedValue({ action: Share.dismissedAction });
      renderDashboard();

      await act(async () => {
        fireEvent.press(screen.getByTestId('referral-share-button'));
      });

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'I may receive compensation from your eligible activity.',
          ),
          url: 'https://link.metamask.io/rewards?referral=8F3A21',
        }),
      );
    });
  });

  describe('performance earnings statuses', () => {
    it('opens the available earnings info sheet from the status label', () => {
      renderDashboard('performance');

      fireEvent.press(screen.getByLabelText('Learn about available earnings'));

      expect(screen.getByText('Available earnings')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'These earnings have completed eligibility checks and are ready to claim.',
        ),
      ).toBeOnTheScreen();
    });

    it('opens the pending earnings info sheet from the status label', () => {
      renderDashboard('performance');

      fireEvent.press(screen.getByLabelText('Learn about pending earnings'));

      expect(screen.getByText('Pending earnings')).toBeOnTheScreen();
    });
  });

  describe('payout details', () => {
    it('opens payout details when the recent payout row is pressed', () => {
      renderDashboard('performance');

      fireEvent.press(screen.getByTestId('recent-payout-row'));

      expect(screen.getByText('Payout details')).toBeOnTheScreen();
      expect(screen.getByText('200.00 mUSD · Completed')).toBeOnTheScreen();
    });

    it('copies the transaction id from payout details', () => {
      renderDashboard('performance');
      fireEvent.press(screen.getByTestId('recent-payout-row'));

      fireEvent.press(screen.getByLabelText('Copy transaction ID'));

      expect(jest.mocked(ClipboardManager.setString)).toHaveBeenCalledWith(
        '0x8a21d534f83b09e91c62abf6e12d4720f9d4c1095fd8407cc40ba4df352f7f3c',
      );
    });

    it('opens the block explorer from payout details', () => {
      const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      renderDashboard('performance');
      fireEvent.press(screen.getByTestId('recent-payout-row'));

      fireEvent.press(screen.getByTestId('view-payout-on-explorer-button'));

      expect(openUrlSpy).toHaveBeenCalledWith(
        'https://etherscan.io/tx/0x8a21d534f83b09e91c62abf6e12d4720f9d4c1095fd8407cc40ba4df352f7f3c',
      );
    });
  });

  describe('QR code sheet', () => {
    const renderQrSheet = () =>
      render(
        <ToastContext.Provider value={{ toastRef: mockToastRef }}>
          <ReferralRevenueShareDashboard
            isQrCodeVisible
            onQrCodeClose={jest.fn()}
          />
        </ToastContext.Provider>,
      );

    it('saves the QR code to files', async () => {
      renderQrSheet();

      await act(async () => {
        fireEvent.press(screen.getByTestId('save-referral-qr-code-button'));
      });

      expect(jest.mocked(FileShare.open)).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'data:image/png;base64,MOCK_QR_DATA',
          filename: 'metamask-referral-8F3A21',
          saveToFiles: true,
        }),
      );
    });

    it('shares the QR code with a compensation disclosure', async () => {
      renderQrSheet();

      await act(async () => {
        fireEvent.press(screen.getByTestId('share-referral-qr-code-button'));
      });

      expect(jest.mocked(FileShare.open)).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'I may receive compensation from your eligible activity.',
          ),
        }),
      );
    });
  });
});
