import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

jest.mock('react-native-qrcode-svg', () => 'QRCode');

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
});
