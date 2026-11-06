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

const mockUseRoute = jest.mocked(useRoute);
const mockGetCardBaanxToken = jest.mocked(getCardBaanxToken);

const pressContinue = () => {
  const { getByTestId } = render(<Complete />);
  fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
};

describe('Complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const { getByTestId } = render(<Complete />);

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
    expect(getByTestId(CompleteSelectors.NOT_NOW_BUTTON)).toHaveTextContent(
      strings('card.card_onboarding.not_now_button'),
    );
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

  it('goes back when Not now is pressed', () => {
    const { getByTestId } = render(<Complete />);

    fireEvent.press(getByTestId(CompleteSelectors.NOT_NOW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
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
