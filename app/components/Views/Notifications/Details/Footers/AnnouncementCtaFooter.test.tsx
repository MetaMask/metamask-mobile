import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AnnouncementCtaFooter from './AnnouncementCtaFooter';
import SharedDeeplinkManager from '../../../../../core/DeeplinkManager/DeeplinkManager';
import AppConstants from '../../../../../core/AppConstants';
import Logger from '../../../../../util/Logger';
import { ModalFooterType } from '../../../../../util/notifications/constants/config';
import { createMockFeatureAnnouncementRaw } from '@metamask/notification-services-controller/notification-services/mocks';
import { processNotification } from '@metamask/notification-services-controller/notification-services';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('../../../../../core/DeeplinkManager/DeeplinkManager', () => {
  const mockParse = jest.fn().mockResolvedValue(true);
  return {
    __esModule: true,
    default: {
      init: jest.fn(),
      start: jest.fn(),
      getInstance: jest.fn(() => ({ parse: mockParse })),
      parse: mockParse,
      setDeeplink: jest.fn(),
      getPendingDeeplink: jest.fn(),
      expireDeeplink: jest.fn(),
    },
  };
});

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../useStyles', () => ({
  __esModule: true,
  default: () => ({
    styles: {
      ctaBtn: {},
    },
    theme: {},
  }),
}));

describe('AnnouncementCtaFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  describe('with externalLink', () => {
    it('renders button with external link text', () => {
      const props = {
        type: ModalFooterType.ANNOUNCEMENT_CTA,
        externalLink: {
          externalLinkUrl: 'https://metamask.io/test',
          externalLinkText: 'Learn More',
        },
        notification: processNotification(createMockFeatureAnnouncementRaw()),
      } as const;

      const { getByText } = render(<AnnouncementCtaFooter {...props} />);

      expect(getByText('Learn More')).toBeOnTheScreen();
    });

    it('calls Linking.openURL when external link button is pressed', () => {
      const props = {
        type: ModalFooterType.ANNOUNCEMENT_CTA,
        externalLink: {
          externalLinkUrl: 'https://metamask.io/test',
          externalLinkText: 'Learn More',
        },
        notification: processNotification(createMockFeatureAnnouncementRaw()),
      } as const;

      const { getByText } = render(<AnnouncementCtaFooter {...props} />);
      const button = getByText('Learn More');
      fireEvent.press(button);

      expect(Linking.openURL).toHaveBeenCalledWith('https://metamask.io/test');
    });

    it('logs error when Linking.openURL fails', async () => {
      const testError = new Error('Failed to open URL');
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(testError);

      const props = {
        type: ModalFooterType.ANNOUNCEMENT_CTA,
        externalLink: {
          externalLinkUrl: 'https://metamask.io/test',
          externalLinkText: 'Learn More',
        },
        notification: processNotification(createMockFeatureAnnouncementRaw()),
      } as const;

      const { getByText } = render(<AnnouncementCtaFooter {...props} />);
      const button = getByText('Learn More');
      fireEvent.press(button);

      await new Promise(process.nextTick);

      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        'Error opening external URL',
      );
    });
  });

  describe('with mobileLink', () => {
    it('renders button with mobile link text', () => {
      const props = {
        type: ModalFooterType.ANNOUNCEMENT_CTA,
        mobileLink: {
          mobileLinkUrl: 'metamask://swap',
          mobileLinkText: 'Try Swap',
        },
        notification: processNotification(createMockFeatureAnnouncementRaw()),
      } as const;

      const { getByText } = render(<AnnouncementCtaFooter {...props} />);

      expect(getByText('Try Swap')).toBeOnTheScreen();
    });

    it('calls SharedDeeplinkManager.parse when mobile link button is pressed', () => {
      const props = {
        type: ModalFooterType.ANNOUNCEMENT_CTA,
        mobileLink: {
          mobileLinkUrl: 'metamask://swap',
          mobileLinkText: 'Try Swap',
        },
        notification: processNotification(createMockFeatureAnnouncementRaw()),
      } as const;

      const { getByText } = render(<AnnouncementCtaFooter {...props} />);
      const button = getByText('Try Swap');
      fireEvent.press(button);

      expect(SharedDeeplinkManager.parse).toHaveBeenCalledWith(
        'metamask://swap',
        {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        },
      );
    });
  });
});
