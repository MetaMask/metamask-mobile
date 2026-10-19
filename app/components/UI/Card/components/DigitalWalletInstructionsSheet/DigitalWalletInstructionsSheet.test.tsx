import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import { CardScreens } from '../../util/metrics';
import DigitalWalletInstructionsSheet from './DigitalWalletInstructionsSheet';
import { DigitalWalletInstructionsSheetSelectors } from './DigitalWalletInstructionsSheet.testIds';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

const mockOnCloseBottomSheet = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());
const mockRevealCardDetails = jest.fn().mockResolvedValue(undefined);
const mockClearCardDetails = jest.fn();
const mockCopyCardDetail = jest.fn();

let mockRevealState = {
  isCardDetailsLoading: false,
  isCardDetailsImageLoading: false,
  onCardDetailsImageLoad: jest.fn(),
  cardDetailsImageUrl: null as string | null,
  onCardDetailsImageError: jest.fn(),
  cardSensitiveDetails: null as {
    pan: string;
    cvv2: string;
    expiry: string;
    embossedName: string;
  } | null,
  isSensitiveDetailsLoading: false,
  isDetailsVisible: false,
  clearCardDetails: mockClearCardDetails,
  copyCardDetail: mockCopyCardDetail,
  revealCardDetails: mockRevealCardDetails,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useCardCapabilities', () => ({
  useCardCapabilities: () => ({ supportsSensitiveDetailsView: true }),
}));

jest.mock('../../hooks/useCardHomeData', () => ({
  useCardHomeData: () => ({ data: { card: { type: 'VIRTUAL' } } }),
}));

jest.mock('../../hooks/useRevealCardDetails', () => ({
  useRevealCardDetails: () => mockRevealState,
}));

jest.mock('../CardScreenshotDeterrent', () => {
  const { View } = jest.requireActual('react-native');
  return {
    CardScreenshotDeterrent: ({ enabled }: { enabled: boolean }) => (
      <View testID={`screenshot-deterrent-${enabled}`} />
    ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const setPlatform = (platform: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: platform,
  });
};

const getBuilder = (callIndex: number) =>
  mockCreateEventBuilder.mock.results[callIndex].value as ReturnType<
    typeof createMockEventBuilder
  >;

const mockActiveProvider = (providerId: string) => {
  jest.mocked(useSelector).mockImplementation((selector) => {
    if (selector === selectCardActiveProviderId) {
      return providerId;
    }
    return undefined;
  });
};

describe('DigitalWalletInstructionsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('ios');
    mockActiveProvider('immersve');
    mockRevealCardDetails.mockResolvedValue(undefined);
    mockRevealState = {
      isCardDetailsLoading: false,
      isCardDetailsImageLoading: false,
      onCardDetailsImageLoad: jest.fn(),
      cardDetailsImageUrl: null,
      onCardDetailsImageError: jest.fn(),
      cardSensitiveDetails: null,
      isSensitiveDetailsLoading: false,
      isDetailsVisible: false,
      clearCardDetails: mockClearCardDetails,
      copyCardDetail: mockCopyCardDetail,
      revealCardDetails: mockRevealCardDetails,
    };
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('shows Apple Wallet heading and three steps on iOS', async () => {
    const { getByTestId, queryByTestId } = render(
      <DigitalWalletInstructionsSheet />,
    );

    await waitFor(() => {
      expect(mockRevealCardDetails).toHaveBeenCalled();
    });

    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.WALLET_HEADING),
    ).toHaveTextContent('Apple Wallet');
    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(1)),
    ).toHaveTextContent(/Open Apple Wallet/);
    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(3)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(DigitalWalletInstructionsSheetSelectors.step(4)),
    ).toBeNull();
  });

  it('shows Google Wallet heading and steps on Android', async () => {
    setPlatform('android');

    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    await waitFor(() => {
      expect(mockRevealCardDetails).toHaveBeenCalled();
    });

    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.WALLET_HEADING),
    ).toHaveTextContent('Google Wallet');
    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(1)),
    ).toHaveTextContent(/Open Google Wallet/);
  });

  it('tracks the OS wallet type when the sheet opens', async () => {
    render(<DigitalWalletInstructionsSheet />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(getBuilder(0).addProperties).toHaveBeenCalledWith({
      provider: 'immersve',
      screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
      wallet_type: 'apple_wallet',
    });
  });

  it('tracks the active Baanx provider for Exodus cardholders', async () => {
    mockActiveProvider('baanx');

    render(<DigitalWalletInstructionsSheet />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    expect(getBuilder(0).addProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
      wallet_type: 'apple_wallet',
    });
  });

  it('requests reveal on mount and shows retry when auth fails', async () => {
    const { getByTestId, queryByTestId } = render(
      <DigitalWalletInstructionsSheet />,
    );

    await waitFor(() => {
      expect(mockRevealCardDetails).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        getByTestId(
          DigitalWalletInstructionsSheetSelectors.VIEW_CARD_DETAILS_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      getByTestId(
        DigitalWalletInstructionsSheetSelectors.VIEW_CARD_DETAILS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(mockRevealCardDetails).toHaveBeenCalledTimes(2);
    });

    expect(
      queryByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON),
    ).toBeNull();
  });

  it('does not show a details shimmer while biometric auth is pending', () => {
    mockRevealCardDetails.mockImplementation(
      () => new Promise(() => undefined),
    );

    const { getByTestId, queryByTestId } = render(
      <DigitalWalletInstructionsSheet />,
    );

    expect(
      queryByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON),
    ).toBeNull();
    expect(
      getByTestId(
        DigitalWalletInstructionsSheetSelectors.VIEW_CARD_DETAILS_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('shows a details shimmer only while fetching after auth', () => {
    mockRevealState = {
      ...mockRevealState,
      isSensitiveDetailsLoading: true,
    };

    const { getByTestId, queryByTestId } = render(
      <DigitalWalletInstructionsSheet />,
    );

    expect(
      getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        DigitalWalletInstructionsSheetSelectors.VIEW_CARD_DETAILS_BUTTON,
      ),
    ).toBeNull();
    expect(
      queryByTestId(DigitalWalletInstructionsSheetSelectors.DESCRIPTION),
    ).toBeNull();
  });

  it('renders Immersve sensitive details and enables screenshot deterrence', async () => {
    mockRevealState = {
      ...mockRevealState,
      isDetailsVisible: true,
      cardSensitiveDetails: {
        pan: '4111111111111111',
        cvv2: '123',
        expiry: '202512',
        embossedName: 'TEST USER',
      },
    };

    const { getByTestId, queryByTestId } = render(
      <DigitalWalletInstructionsSheet />,
    );

    await waitFor(() => {
      expect(
        getByTestId(CardHomeSelectors.CARD_SENSITIVE_DETAILS),
      ).toBeOnTheScreen();
    });
    expect(getByTestId('screenshot-deterrent-true')).toBeOnTheScreen();
    expect(
      queryByTestId(DigitalWalletInstructionsSheetSelectors.DESCRIPTION),
    ).toBeNull();
  });

  it('renders Baanx secure image when provided', async () => {
    mockRevealState = {
      ...mockRevealState,
      isDetailsVisible: true,
      cardDetailsImageUrl: 'https://example.com/card.png',
    };

    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    await waitFor(() => {
      expect(
        getByTestId(CardHomeSelectors.CARD_DETAILS_IMAGE),
      ).toBeOnTheScreen();
    });
  });

  it('clears details when the sheet closes', async () => {
    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    await waitFor(() => {
      expect(mockRevealCardDetails).toHaveBeenCalled();
    });

    fireEvent.press(
      getByTestId(DigitalWalletInstructionsSheetSelectors.CLOSE_BUTTON),
    );

    expect(mockClearCardDetails).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
