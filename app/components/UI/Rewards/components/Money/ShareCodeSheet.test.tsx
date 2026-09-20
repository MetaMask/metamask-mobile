import React from 'react';
import { Linking, Modal, Platform, Share } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import ShareCodeSheet, { SHARE_CODE_SHEET_TEST_IDS } from './ShareCodeSheet';

const TEST_IDS = SHARE_CODE_SHEET_TEST_IDS;
const CODE = 'ABC123';
const CODE_URL = 'https://link.metamask.io/home?ref=ABC123';
const API_SHARE_URL = 'https://link.metamask.io/home?ref=VANITY';

// The design-system sheet is mocked globally without forwarding its props, so
// neither the overlay/swipe dismissal nor the close-animation callback can be
// reached. This stand-in forwards both and keeps the real sheet's guard against
// a second close request.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        onClose,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        onClose?: (hasPendingAction?: boolean) => void;
        goBack?: () => void;
      },
      ref: React.Ref<{
        onCloseBottomSheet: (callback?: () => void) => void;
        onOpenBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      const closeRequestedRef = ReactActual.useRef(false);

      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: (callback?: () => void) => callback?.(),
        onCloseBottomSheet: (callback?: () => void) => {
          if (closeRequestedRef.current) {
            return;
          }
          closeRequestedRef.current = true;
          goBack?.();
          onClose?.(Boolean(callback));
          callback?.();
        },
      }));

      return ReactActual.createElement(
        RN.View,
        { testID, onClose, goBack },
        children,
      );
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return { ...actual, BottomSheet };
});

jest.mock('react-native-qrcode-svg', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value, testID }: { value: string; testID?: string }) =>
      ReactActual.createElement(RN.View, {
        testID,
        accessibilityValue: { text: value },
      }),
  };
});

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const LOCALIZED_TEXT = {
  shareCode: 'Share code',
  shareVia: 'Share via',
  copyLink: 'Copy link',
  messages: 'Messages',
  telegram: 'Telegram',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
} as unknown as ReferralLocalizedText;

interface RenderOptions {
  open?: boolean;
  code?: string | null;
  shareUrl?: string | null;
  localizedText?: ReferralLocalizedText | undefined;
  onClose?: () => void;
}

const renderSheet = ({
  open = true,
  code = CODE,
  shareUrl = null,
  localizedText = LOCALIZED_TEXT,
  onClose = jest.fn(),
}: RenderOptions = {}) => ({
  onClose,
  ...render(
    <ShareCodeSheet
      open={open}
      code={code}
      shareUrl={shareUrl}
      localizedText={localizedText}
      onClose={onClose}
    />,
  ),
});

describe('ShareCodeSheet', () => {
  let shareSpy: jest.SpyInstance;
  let openUrlSpy: jest.SpyInstance;
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: 'sharedAction',
    } as Awaited<ReturnType<typeof Share.share>>);
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    jest.restoreAllMocks();
  });

  describe('presentation', () => {
    it('renders nothing while the parent keeps it closed', () => {
      const { queryByTestId } = renderSheet({ open: false });

      expect(queryByTestId(TEST_IDS.CONTAINER)).toBeNull();
    });

    it('renders the sheet with the localized title when open', () => {
      const { getByTestId, getByText } = renderSheet();

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
      expect(getByText('Share code')).toBeOnTheScreen();
    });

    it('hosts the sheet in a full-screen transparent modal so the overlay covers the dashboard', () => {
      const { UNSAFE_getByType } = renderSheet();

      const modal = UNSAFE_getByType(Modal);

      expect(modal.props.transparent).toBe(true);
      expect(modal.props.visible).toBe(true);
    });

    it('falls back to an existing Mobile string for the title when the API copy is absent', () => {
      const { getByText } = render(
        <ShareCodeSheet
          open
          code={CODE}
          shareUrl={null}
          localizedText={undefined}
          onClose={jest.fn()}
        />,
      );

      expect(
        getByText(strings('rewards.referral.actions.share_referral_link')),
      ).toBeOnTheScreen();
    });

    it('does not print the referral code as text, matching the KOL share sheet', () => {
      const { queryByText } = renderSheet();

      expect(queryByText(CODE)).toBeNull();
    });
  });

  describe('resolved share url', () => {
    // The QR graphic is hidden from assistive tech — the copy action is what a
    // screen reader can act on — so the queries for it have to look past that.
    const getQrValue = (
      getByTestId: ReturnType<typeof render>['getByTestId'],
    ) =>
      getByTestId(TEST_IDS.QR, { includeHiddenElements: true }).props
        .accessibilityValue.text;

    it('renders a QR code for the link built from the code', () => {
      const { getByTestId } = renderSheet();

      expect(getQrValue(getByTestId)).toBe(CODE_URL);
    });

    it('prefers the API share_url for the QR code', () => {
      const { getByTestId } = renderSheet({ shareUrl: API_SHARE_URL });

      expect(getQrValue(getByTestId)).toBe(API_SHARE_URL);
    });

    it('uses a share_url whose path is not /home?ref=', () => {
      const templateUrl = 'https://link.metamask.io/join?code=VANITY';
      const { getByTestId } = renderSheet({ shareUrl: templateUrl });

      expect(getQrValue(getByTestId)).toBe(templateUrl);
    });

    it('drops the QR and the link actions when there is no url', () => {
      const { getByTestId, queryByTestId } = renderSheet({
        code: null,
        shareUrl: null,
      });

      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
      expect(
        queryByTestId(TEST_IDS.QR, { includeHiddenElements: true }),
      ).toBeNull();
      expect(queryByTestId(TEST_IDS.SHARE_VIA)).toBeNull();
      expect(queryByTestId(TEST_IDS.COPY_LINK)).toBeNull();
      expect(queryByTestId(TEST_IDS.MESSAGES)).toBeNull();
      expect(queryByTestId(TEST_IDS.TELEGRAM)).toBeNull();
    });

    it('shares the link built from the code when the API share_url cannot be vouched for', () => {
      const { getByTestId } = renderSheet({
        shareUrl: 'https://evil.com@link.metamask.io/home?ref=ABC',
      });

      expect(getQrValue(getByTestId)).toBe(CODE_URL);

      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));

      expect(Clipboard.setString).toHaveBeenCalledWith(CODE_URL);
    });

    it('still presents the sheet when the url is unusable', () => {
      const { getByTestId, queryByTestId } = renderSheet({
        code: '',
        shareUrl: `javascript:${'alert(1)'}`,
      });

      expect(
        queryByTestId(TEST_IDS.QR, { includeHiddenElements: true }),
      ).toBeNull();
      expect(getByTestId(TEST_IDS.CONTAINER)).toBeOnTheScreen();
    });
  });

  describe('actions', () => {
    // The icon and caption inside each button are hidden from assistive tech
    // so the button is announced once, which also hides them from the default
    // queries.
    const queryCheckIcon = (
      queryByTestId: ReturnType<typeof render>['queryByTestId'],
    ) =>
      queryByTestId(TEST_IDS.COPY_LINK_CHECK, { includeHiddenElements: true });

    it.each([
      ['share via', TEST_IDS.SHARE_VIA, 'Share via'],
      ['copy link', TEST_IDS.COPY_LINK, 'Copy link'],
      ['messages', TEST_IDS.MESSAGES, 'Messages'],
      ['telegram', TEST_IDS.TELEGRAM, 'Telegram'],
    ])('renders the %s action as a labelled button', (_name, testId, label) => {
      const { getByTestId } = renderSheet();

      const action = getByTestId(testId);

      expect(action).toBeOnTheScreen();
      expect(action.props.accessibilityRole).toBe('button');
      expect(action.props.accessibilityLabel).toBe(label);
    });

    it.each([
      ['share via', TEST_IDS.SHARE_VIA],
      ['copy link', TEST_IDS.COPY_LINK],
      ['messages', TEST_IDS.MESSAGES],
      ['telegram', TEST_IDS.TELEGRAM],
    ])(
      'hides the %s icon and caption from assistive tech so the button is announced once',
      (_name, testId) => {
        const { getByTestId } = renderSheet();

        const content = getByTestId(`${testId}-content`, {
          includeHiddenElements: true,
        });

        expect(content.props.accessibilityElementsHidden).toBe(true);
        expect(content.props.importantForAccessibility).toBe(
          'no-hide-descendants',
        );
      },
    );

    it('omits an action the API has no copy for', () => {
      const { queryByTestId, getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          telegram: '',
        } as unknown as ReferralLocalizedText,
      });

      expect(queryByTestId(TEST_IDS.TELEGRAM)).toBeNull();
      expect(getByTestId(TEST_IDS.COPY_LINK)).toBeOnTheScreen();
    });

    it('copies the resolved url and confirms the first copy', () => {
      const { getByTestId, queryByTestId, getByText } = renderSheet({
        shareUrl: API_SHARE_URL,
      });

      expect(queryCheckIcon(queryByTestId)).toBeNull();

      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));

      expect(Clipboard.setString).toHaveBeenCalledWith(API_SHARE_URL);
      expect(queryCheckIcon(queryByTestId)).not.toBeNull();
      expect(getByText('Copied 1 time')).toBeOnTheScreen();
    });

    it('counts repeated copies', () => {
      const { getByTestId, getByText } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));
      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));
      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));

      expect(Clipboard.setString).toHaveBeenCalledTimes(3);
      expect(Clipboard.setString).toHaveBeenLastCalledWith(CODE_URL);
      expect(getByText('Copied 3 times')).toBeOnTheScreen();
    });

    it('forgets the copy count once the parent reopens the sheet', () => {
      const sheet = (open: boolean) => (
        <ShareCodeSheet
          open={open}
          code={CODE}
          shareUrl={null}
          localizedText={LOCALIZED_TEXT}
          onClose={jest.fn()}
        />
      );
      const { getByTestId, queryByTestId, queryByText, rerender } = render(
        sheet(true),
      );

      fireEvent.press(getByTestId(TEST_IDS.COPY_LINK));
      expect(queryByText('Copied 1 time')).toBeOnTheScreen();

      rerender(sheet(false));
      rerender(sheet(true));

      expect(queryByText('Copied 1 time')).toBeNull();
      expect(queryCheckIcon(queryByTestId)).toBeNull();
    });

    it('shares the url through the native share sheet on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.SHARE_VIA));

      expect(shareSpy).toHaveBeenCalledWith({
        message: strings('rewards.referral.actions.share_referral_subject'),
        url: CODE_URL,
      });
    });

    it('shares the url inside the message on Android', () => {
      Platform.OS = 'android';
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.SHARE_VIA));

      expect(shareSpy).toHaveBeenCalledWith({
        message: `${strings(
          'rewards.referral.actions.share_referral_subject',
        )}\n${CODE_URL}`,
      });
    });

    it('opens the SMS composer with the iOS body separator', () => {
      Platform.OS = 'ios';
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.MESSAGES));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `sms:&body=${encodeURIComponent(CODE_URL)}`,
      );
    });

    it('fills {url} in inviteBody for the SMS composer', () => {
      Platform.OS = 'ios';
      const { getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          inviteBody:
            'Earn 2× cashback on Swaps and Perps trades for a limited time. {url}',
        } as unknown as ReferralLocalizedText,
      });

      fireEvent.press(getByTestId(TEST_IDS.MESSAGES));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `sms:&body=${encodeURIComponent(
          `Earn 2× cashback on Swaps and Perps trades for a limited time. ${CODE_URL}`,
        )}`,
      );
    });

    it('appends the url when inviteBody has no {url} placeholder', () => {
      Platform.OS = 'android';
      const { getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          inviteBody:
            'Earn 2× cashback on Swaps and Perps trades for a limited time.',
        } as unknown as ReferralLocalizedText,
      });

      fireEvent.press(getByTestId(TEST_IDS.MESSAGES));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `sms:?body=${encodeURIComponent(
          `Earn 2× cashback on Swaps and Perps trades for a limited time. ${CODE_URL}`,
        )}`,
      );
    });

    it('sends only the url when inviteBody still has an unsubstituted placeholder', () => {
      Platform.OS = 'ios';
      const { getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          inviteBody:
            'Earn {cashbackMultiplier}× cashback on Swaps and Perps trades for a limited time.',
        } as unknown as ReferralLocalizedText,
      });

      fireEvent.press(getByTestId(TEST_IDS.MESSAGES));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `sms:&body=${encodeURIComponent(CODE_URL)}`,
      );
    });

    it('opens the SMS composer with the Android body separator', () => {
      Platform.OS = 'android';
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.MESSAGES));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `sms:?body=${encodeURIComponent(CODE_URL)}`,
      );
    });

    it('opens Telegram with the url', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.TELEGRAM));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `https://t.me/share/url?url=${encodeURIComponent(CODE_URL)}`,
      );
    });

    it('opens Telegram with inviteBody as the share text', () => {
      const { getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          inviteBody:
            'Earn 2× cashback on Swaps and Perps trades for a limited time.',
        } as unknown as ReferralLocalizedText,
      });

      fireEvent.press(getByTestId(TEST_IDS.TELEGRAM));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `https://t.me/share/url?url=${encodeURIComponent(CODE_URL)}&text=${encodeURIComponent(
          'Earn 2× cashback on Swaps and Perps trades for a limited time.',
        )}`,
      );
    });

    it('opens Telegram without text when inviteBody still has an unsubstituted placeholder', () => {
      const { getByTestId } = renderSheet({
        localizedText: {
          ...LOCALIZED_TEXT,
          inviteBody:
            'Earn {cashbackMultiplier}× cashback on Swaps and Perps trades for a limited time.',
        } as unknown as ReferralLocalizedText,
      });

      fireEvent.press(getByTestId(TEST_IDS.TELEGRAM));

      expect(openUrlSpy).toHaveBeenCalledWith(
        `https://t.me/share/url?url=${encodeURIComponent(CODE_URL)}`,
      );
    });

    it('logs instead of throwing when the native share is refused', async () => {
      shareSpy.mockRejectedValue(new Error('no share'));
      const { getByTestId } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.SHARE_VIA));
      await act(async () => undefined);

      expect(Logger.log).toHaveBeenCalled();
    });

    it.each([
      ['the SMS composer', TEST_IDS.MESSAGES],
      ['Telegram', TEST_IDS.TELEGRAM],
    ])(
      'logs instead of throwing when %s cannot be opened',
      async (_name, testId) => {
        openUrlSpy.mockRejectedValue(new Error('no handler'));
        const { getByTestId } = renderSheet();

        fireEvent.press(getByTestId(testId));
        await act(async () => undefined);

        expect(Logger.log).toHaveBeenCalled();
      },
    );
  });

  describe('dismissal', () => {
    it('is closed by the parent callback, not by navigation', () => {
      const { getByTestId } = renderSheet();

      expect(getByTestId(TEST_IDS.CONTAINER).props.goBack).toBeUndefined();
    });

    it('calls onClose once the close animation has run', () => {
      const { getByTestId, onClose } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.CLOSE));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the sheet is dismissed natively', () => {
      const { getByTestId, onClose } = renderSheet();

      act(() => {
        getByTestId(TEST_IDS.CONTAINER).props.onClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose exactly once when both the close button and the sheet report a dismissal', () => {
      const { getByTestId, onClose } = renderSheet();

      fireEvent.press(getByTestId(TEST_IDS.CLOSE));
      act(() => {
        getByTestId(TEST_IDS.CONTAINER).props.onClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('asks the sheet to close when the hardware back button dismisses the modal', () => {
      const { UNSAFE_getByType, onClose } = renderSheet();

      act(() => {
        UNSAFE_getByType(Modal).props.onRequestClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
