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
import SRPQuiz, { SRPQuizProps } from './SRPQuiz';
import Routes from '../../../../constants/navigation/Routes';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

const renderSRPQuiz = (props: SRPQuizProps, completeQuiz: boolean = true) => {
  const mockStore = configureMockStore();
  const selectedAccount =
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount;
  const selectedAddress =
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[selectedAccount]
      .address;

  // Create a second address that will be associated with the second HD keyring
  const secondAddress = '0x2222222222222222222222222222222222222222';

  const initialState = {
    engine: {
      backgroundState: {
        AccountsController: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE,
          internalAccounts: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
            accounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
              [selectedAccount]: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
                  selectedAccount
                ],
                metadata: {
                  ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
                    selectedAccount
                  ].metadata,
                  keyring: {
                    type: KeyringTypes.hd,
                  },
                },
              },
            },
          },
        },
        KeyringController: {
          isUnlocked: false,
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: ['0x1111111111111111111111111111111111111111'],
              metadata: {
                id: 'hd-1',
                name: 'HD Keyring 1',
              },
            },
            {
              type: KeyringTypes.hd,
              accounts: [selectedAddress],
              metadata: {
                id: 'hd-2',
                name: 'HD Keyring 2',
              },
            },
            {
              type: KeyringTypes.hd,
              accounts: [secondAddress],
              metadata: {
                id: 'hd-3',
                name: 'HD Keyring 3',
              },
            },
          ],
          keyringsMetadata: [],
        },
      },
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
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });
  });

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

  it('tracks metrics events with hdEntropyIndex when completing quiz', async () => {
    const keyringId = '123';
    const props = {
      route: {
        params: { keyringId },
      },
    };

    renderSRPQuiz(props, true);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.REVEAL_SRP_INITIATED,
        )
          .addProperties({
            hd_entropy_index: 1,
          })
          .build(),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.REVEAL_SRP_CTA)
          .addProperties({
            hd_entropy_index: 1,
          })
          .build(),
      );
    });
  });
});
