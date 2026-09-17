import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import { CardActions, CardScreens } from '../../util/metrics';
import DigitalWalletInstructionsSheet from './DigitalWalletInstructionsSheet';
import { DigitalWalletInstructionsSheetSelectors } from './DigitalWalletInstructionsSheet.testIds';

const mockOnCloseBottomSheet = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

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
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('shows Apple Wallet instructions by default on iOS', () => {
    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.TITLE),
    ).toHaveTextContent('Add card to digital wallet');
    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(2)),
    ).toHaveTextContent(/Open Apple Wallet/);
    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.STEPS),
    ).toBeOnTheScreen();
  });

  it('shows Google Wallet instructions by default on Android', () => {
    setPlatform('android');

    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(2)),
    ).toHaveTextContent(/Open Google Wallet/);
  });

  it('tracks the default wallet when the sheet opens', () => {
    render(<DigitalWalletInstructionsSheet />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(getBuilder(0).addProperties).toHaveBeenCalledWith({
      provider: 'immersve',
      screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
      wallet_type: 'apple_wallet',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks the active Baanx provider for Exodus cardholders', () => {
    mockActiveProvider('baanx');

    render(<DigitalWalletInstructionsSheet />);

    expect(getBuilder(0).addProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      screen: CardScreens.DIGITAL_WALLET_INSTRUCTIONS_SHEET,
      wallet_type: 'apple_wallet',
    });
  });

  it('switches to Google Wallet instructions and tracks the selection', () => {
    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);
    mockTrackEvent.mockClear();

    fireEvent.press(
      getByTestId(DigitalWalletInstructionsSheetSelectors.GOOGLE_WALLET_TAB),
    );

    expect(
      getByTestId(DigitalWalletInstructionsSheetSelectors.step(2)),
    ).toHaveTextContent(/Open Google Wallet/);
    expect(mockCreateEventBuilder).toHaveBeenLastCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(getBuilder(1).addProperties).toHaveBeenCalledWith({
      provider: 'immersve',
      action: CardActions.DIGITAL_WALLET_INSTRUCTIONS_PLATFORM_SWITCH,
      wallet_type: 'google_wallet',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet from the header', () => {
    const { getByTestId } = render(<DigitalWalletInstructionsSheet />);

    fireEvent.press(
      getByTestId(DigitalWalletInstructionsSheetSelectors.CLOSE_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
