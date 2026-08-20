import React from 'react';
import { Linking, Share } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FileShare from 'react-native-share';
import ReferralRevenueShareDashboard from './ReferralRevenueShareDashboard';
import ClipboardManager from '../../../../../core/ClipboardManager';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = (..._args: unknown[]) => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
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

const openClaimSheet = () => {
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

  describe('claim review', () => {
    it('shows gross-to-net review after continue is pressed', () => {
      openClaimReview();

      expect(screen.getByText('Review claim')).toBeOnTheScreen();
      expect(screen.getByText("You'll receive")).toBeOnTheScreen();
      expect(screen.getByText('Gross')).toBeOnTheScreen();
      expect(screen.getByText('Money Account')).toBeOnTheScreen();
      expect(screen.getByText('1–2 business days')).toBeOnTheScreen();
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
