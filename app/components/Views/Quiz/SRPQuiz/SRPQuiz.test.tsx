import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import {
  SrpQuizGetStartedSelectorsIDs,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsIDs,
} from './SrpQuizModal.testIds';
import SRPQuiz, { SRPQuizProps } from './SRPQuiz';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { Linking } from 'react-native';

const mockNavigate = jest.fn();

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

const renderSRPQuiz = (
  props: SRPQuizProps,
  completeQuiz: boolean = true,
  hasVault: boolean = false,
) => {
  const mockStore = configureMockStore();
  const initialState = {
    engine: {
      backgroundState: {
        SeedlessOnboardingController: {
          vault: hasVault ? 'encrypted-vault-data' : null,
        },
      },
    },
  };
  const store = mockStore(initialState);

  const renderResult = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <SRPQuiz {...props} />
        </ThemeContext.Provider>
      </Provider>
    </SafeAreaProvider>,
  );

  if (completeQuiz) {
    const { getByTestId } = renderResult;

    const startButton = getByTestId(SrpQuizGetStartedSelectorsIDs.BUTTON);
    fireEvent.press(startButton);

    const rightAnswerButton = getByTestId(
      SrpSecurityQuestionOneSelectorsIDs.RIGHT_ANSWER,
    );
    fireEvent.press(rightAnswerButton);

    const nextButton = getByTestId(
      SrpSecurityQuestionOneSelectorsIDs.RIGHT_CONTINUE,
    );
    fireEvent.press(nextButton);

    const rightAnswerButton2 = getByTestId(
      SrpSecurityQuestionTwoSelectorsIDs.RIGHT_ANSWER,
    );
    fireEvent.press(rightAnswerButton2);

    const nextButton2 = getByTestId(
      SrpSecurityQuestionTwoSelectorsIDs.RIGHT_CONTINUE,
    );
    fireEvent.press(nextButton2);
  }

  return renderResult;
};

describe('SRPQuiz', () => {
  it('passes the keyringId to the SRPQuiz', async () => {
    const keyringId = '123';
    const props = {
      route: {
        params: { keyringId },
      },
    };

    renderSRPQuiz(props, true);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
        {
          shouldUpdateNav: true,
          keyringId,
        },
      );
    });
  });

  it('should navigate to the learn more article of social login when the learn more button is pressed', async () => {
    const keyringId = '123';
    const props = {
      route: {
        params: { keyringId },
      },
    };
    const { getByText } = renderSRPQuiz(props, true, true);

    const learnMoreButton = getByText(strings('srp_security_quiz.learn_more'));
    fireEvent.press(learnMoreButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/#metamask-secret-recovery-phrase-dos-and-donts',
    );
  });
});
