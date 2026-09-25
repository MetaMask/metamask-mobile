import React from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import OnboardingInvite from './OnboardingInvite';
import { OnboardingInviteTestIds } from './OnboardingInvite.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { KOL_INVITE_FIXTURE } from '../../UI/Rewards/components/KolDashboard/rewardsUiFixtures';

const mockOnComplete = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

const renderComponent = (referralCode: string | null = null) =>
  renderScreen(
    OnboardingInvite,
    { name: 'OnboardingInvite' },
    { state: { rewards: { onboardingReferralCode: referralCode } } },
    { onComplete: mockOnComplete },
  );

describe('OnboardingInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the invite offer and both actions', () => {
    renderComponent();

    expect(screen.getByTestId(OnboardingInviteTestIds.TITLE)).toHaveTextContent(
      strings('onboarding_invite.title'),
    );
    expect(
      screen.getByTestId(OnboardingInviteTestIds.DESCRIPTION),
    ).toHaveTextContent(strings('onboarding_invite.description'));
    expect(
      screen.getByTestId(OnboardingInviteTestIds.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(OnboardingInviteTestIds.CANCEL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('continues onboarding when Continue is pressed', () => {
    renderComponent();

    fireEvent.press(
      screen.getByTestId(OnboardingInviteTestIds.CONTINUE_BUTTON),
    );

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('continues onboarding when Cancel is pressed', () => {
    renderComponent();

    fireEvent.press(screen.getByTestId(OnboardingInviteTestIds.CANCEL_BUTTON));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the referral code the user arrived with', () => {
    renderComponent('AB12CD');

    expect(
      screen.getByTestId(OnboardingInviteTestIds.REFERRAL_CODE_INPUT).props
        .value,
    ).toBe('AB12CD');
  });

  it('shows the fixture referral code when the user has no stored code', () => {
    renderComponent();

    expect(
      screen.getByTestId(OnboardingInviteTestIds.REFERRAL_CODE_INPUT).props
        .value,
    ).toBe(KOL_INVITE_FIXTURE.referralCode);
  });

  it('keeps Continue disabled until the code is complete', () => {
    const { store } = renderComponent('AB12CD');

    fireEvent.changeText(
      screen.getByTestId(OnboardingInviteTestIds.REFERRAL_CODE_INPUT),
      'xy34',
    );
    fireEvent.press(
      screen.getByTestId(OnboardingInviteTestIds.CONTINUE_BUTTON),
    );

    expect(store.getState().rewards.onboardingReferralCode).toBe('AB12CD');
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('stores an edited code when the invite is accepted', () => {
    const { store } = renderComponent('AB12CD');

    fireEvent.changeText(
      screen.getByTestId(OnboardingInviteTestIds.REFERRAL_CODE_INPUT),
      'xy34ab',
    );
    fireEvent.press(
      screen.getByTestId(OnboardingInviteTestIds.CONTINUE_BUTTON),
    );

    expect(store.getState().rewards.onboardingReferralCode).toBe('XY34AB');
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('leaves the stored code unchanged when the invite is declined', () => {
    const { store } = renderComponent('AB12CD');

    fireEvent.changeText(
      screen.getByTestId(OnboardingInviteTestIds.REFERRAL_CODE_INPUT),
      'xy34ab',
    );
    fireEvent.press(screen.getByTestId(OnboardingInviteTestIds.CANCEL_BUTTON));

    expect(store.getState().rewards.onboardingReferralCode).toBe('AB12CD');
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('returns to the interest questionnaire from the back arrow', () => {
    renderComponent();

    fireEvent.press(screen.getByTestId(OnboardingInviteTestIds.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
      { onComplete: expect.any(Function) },
    );
  });

  it('reopens the invite after completing the interest questionnaire from back', () => {
    renderComponent();

    fireEvent.press(screen.getByTestId(OnboardingInviteTestIds.BACK_BUTTON));
    const questionnaireParams = mockNavigate.mock.calls[0][1] as {
      onComplete: () => void;
    };
    questionnaireParams.onComplete();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.INVITE, {
      onComplete: mockOnComplete,
    });
  });

  it('returns to the interest questionnaire on hardware back', () => {
    const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

    renderComponent();

    const [event, handler] = addEventListenerSpy.mock.calls[0];
    expect(event).toBe('hardwareBackPress');
    expect(handler()).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
      { onComplete: expect.any(Function) },
    );

    addEventListenerSpy.mockRestore();
  });
});
