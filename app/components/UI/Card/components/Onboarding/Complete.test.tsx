import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StackActions, useRoute } from '@react-navigation/native';
import Complete from './Complete';
import { CompleteSelectors } from './Complete.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { strings } from '../../../../../../locales/i18n';
import { CardActions, CardScreens } from '../../util/metrics';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReduxDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: jest.fn() }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockReduxDispatch,
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../util/cardTokenVault', () => ({
  getCardBaanxToken: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className?: string) => ({ className })),
  }),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: jest.fn(() => false),
  }),
);

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ onBack }: { onBack?: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header-standard-glass' },
          ReactActual.createElement(TouchableOpacity, {
            testID: 'complete-back-button',
            onPress: onBack,
          }),
        ),
    };
  },
);

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(() => false),
}));

jest.mock('../../../KYC/components/Illustration', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    KycIllustrationSource: {
      scanner: 'scanner',
      checkmark: 'checkmark',
      hazard: 'hazard',
    },
    default: () =>
      ReactActual.createElement(View, { testID: 'vba-illustration' }),
  };
});

jest.mock('../../../MarketingMomentTitle', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    BoxAlignItems: { Center: 'Center' },
    BoxJustifyContent: { Center: 'Center', End: 'End' },
    FontWeight: { Medium: 'Medium' },
    TextColor: { TextAlternative: 'TextAlternative' },
    TextVariant: { BodySm: 'BodySm' },
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
    TitleStandard: ({
      title,
      bottomLabel,
      topAccessory,
    }: {
      title?: React.ReactNode;
      bottomLabel?: React.ReactNode;
      topAccessory?: React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'title-standard' },
        topAccessory,
        title,
        bottomLabel,
      ),
    Button: ({
      children,
      testID,
      onPress,
      isDisabled,
      disabled,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      isDisabled?: boolean;
      disabled?: boolean;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID,
          onPress,
          disabled: isDisabled ?? disabled,
          ...props,
        },
        typeof children === 'string'
          ? ReactActual.createElement(Text, null, children)
          : children,
      ),
    ButtonVariant: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

const mockUseRoute = jest.mocked(useRoute);
const mockGetCardBaanxToken = jest.mocked(getCardBaanxToken);
const mockUseReduceMotionState = jest.mocked(useReduceMotionState);

const pressContinue = () => {
  const { getByTestId } = render(<Complete />);
  fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
};

describe('Complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseReduceMotionState.mockReturnValue(false);
    mockUseRoute.mockReturnValue({
      key: 'complete',
      name: 'Complete',
      params: {},
    });
    mockGetCardBaanxToken.mockResolvedValue({
      success: true,
      tokenData: { accessToken: 'mock-token' },
    } as Awaited<ReturnType<typeof getCardBaanxToken>>);
  });

  it('renders the completion copy, artwork, and actions', () => {
    const { getByTestId, queryByTestId } = render(<Complete />);

    expect(getByTestId(CompleteSelectors.TITLE)).toHaveTextContent(
      strings('card.card_onboarding.complete.title'),
    );
    expect(getByTestId(CompleteSelectors.DESCRIPTION)).toHaveTextContent(
      strings('card.card_onboarding.complete.description'),
    );
    expect(getByTestId(CompleteSelectors.IMAGE)).toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toHaveTextContent(
      strings('card.card_onboarding.complete.confirm_button'),
    );
    expect(queryByTestId(CompleteSelectors.NOT_NOW_BUTTON)).toBeNull();
  });

  it('draws the tick in with Rive when Reduce Motion is off', () => {
    const { getByTestId, queryByTestId } = render(<Complete />);

    expect(getByTestId(CompleteSelectors.CHECK_ANIMATION)).toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
  });

  it('shows the static checkmark and all content under Reduce Motion', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(<Complete />);

    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.TITLE)).toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toBeOnTheScreen();
  });

  it('shows neither checkmark while the Reduce Motion check is pending', () => {
    mockUseReduceMotionState.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(<Complete />);

    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.IMAGE)).toBeOnTheScreen();
  });

  it('tracks the screen view on mount', () => {
    render(<Complete />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      screen: CardScreens.COMPLETE,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks the continue press', async () => {
    pressContinue();

    await waitFor(() =>
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      ),
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      action: CardActions.COMPLETE_BUTTON,
    });
  });

  it('opens Card home when a card token exists', async () => {
    pressContinue();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.HOME, { fromCardOnboarding: true }),
      ),
    );
    expect(mockReduxDispatch).toHaveBeenCalledWith(resetOnboardingState());
  });

  it('opens authentication when no card token exists', async () => {
    mockGetCardBaanxToken.mockResolvedValueOnce({
      success: false,
    } as Awaited<ReturnType<typeof getCardBaanxToken>>);

    pressContinue();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.AUTHENTICATION),
      ),
    );
  });

  it('continues to personal details without resetting onboarding', async () => {
    mockUseRoute.mockReturnValue({
      key: 'complete',
      name: 'Complete',
      params: { nextDestination: 'personal_details' },
    });

    pressContinue();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.ONBOARDING.PERSONAL_DETAILS),
      ),
    );
    expect(mockReduxDispatch).not.toHaveBeenCalled();
    expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
  });

  it('continues to the spending limit for an authenticated approval', async () => {
    mockUseRoute.mockReturnValue({
      key: 'complete',
      name: 'Complete',
      params: { nextDestination: 'card_home' },
    });

    pressContinue();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
          flow: 'onboarding',
        }),
      ),
    );
    expect(mockReduxDispatch).toHaveBeenCalledWith(resetOnboardingState());
    expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
  });
});
