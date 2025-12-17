import React from 'react';
import { Share } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import PredictShareButton from './PredictShareButton';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Create mock toast ref
const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

// Wrapper to provide ToastContext
const ToastWrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    { value: { toastRef: mockToastRef } },
    children,
  );

const renderShareButton = (marketId?: string) =>
  renderWithProvider(
    <ToastWrapper>
      <PredictShareButton marketId={marketId} />
    </ToastWrapper>,
  );

describe('PredictShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders share icon button with correct testID', () => {
      renderShareButton('market-123');

      expect(
        screen.getByTestId(PredictMarketDetailsSelectorsIDs.SHARE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('sets accessibility role and label for screen readers', () => {
      const { strings } = jest.requireMock('../../../../../../locales/i18n');
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessible).toBe(true);
      expect(strings).toHaveBeenCalledWith('predict.buttons.share');
    });
  });

  describe('Share Functionality', () => {
    it('calls Share.share with URL containing marketId and utm_source', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://link.metamask.io/predict?market=market-123&utm_source=user_shared',
        }),
        {},
      );
    });

    it('generates URL with empty marketId when prop is undefined', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      renderShareButton(undefined);

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://link.metamask.io/predict?market=&utm_source=user_shared',
        }),
        {},
      );
    });

    it('passes message containing the share URL', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      renderShareButton('market-456');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            'https://link.metamask.io/predict?market=market-456&utm_source=user_shared',
          ),
        }),
        {},
      );
    });
  });

  describe('Copy to Clipboard', () => {
    it('displays toast notification when user copies to clipboard', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.CopyToPasteboard',
      });
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          hasNoTimeout: false,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              isBold: true,
            }),
          ]),
        }),
      );
    });

    it('does not display toast for other share actions', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.Message',
      });
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Share Dialog Outcomes', () => {
    it('completes without error when share is dismissed', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.dismissedAction,
      });
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('completes without error when share succeeds', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.AirDrop',
      });
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      // No toast for non-clipboard share actions
      expect(Share.share).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('catches Share.share rejection without crashing', async () => {
      jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share failed'));
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      // Pressing button should not throw
      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalled();
    });

    it('does not display error toast when sharing fails', async () => {
      jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share failed'));
      renderShareButton('market-123');

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing toastRef without crashing', async () => {
      jest.spyOn(Share, 'share').mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.CopyToPasteboard',
      });

      // Render with null toastRef
      const NullToastWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          ToastContext.Provider,
          { value: { toastRef: { current: null } } },
          children,
        );

      renderWithProvider(
        <NullToastWrapper>
          <PredictShareButton marketId="market-123" />
        </NullToastWrapper>,
      );

      const button = screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.SHARE_BUTTON,
      );

      // Should not throw even when toastRef.current is null
      await act(async () => {
        await fireEvent.press(button);
      });

      expect(Share.share).toHaveBeenCalled();
    });
  });
});
