import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import {
  SrpQuizGetStartedSelectorsIDs,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsIDs,
} from '../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SrpQuizModal.selectors';
import { SRPQuiz, SRPQuizProps } from '.';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const renderSRPQuiz = (props: SRPQuizProps, completeQuiz: boolean = true) => {
  const mockStore = configureMockStore();
  const initialState = {
    engine: {
      backgroundState: {},
    },
  };
  const store = mockStore(initialState);

  const renderResult = render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <SRPQuiz {...props} />
      </ThemeContext.Provider>
    </Provider>,
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
          credentialName: 'seed_phrase',
          shouldUpdateNav: true,
          keyringId,
        },
      );
    });
  });
});
