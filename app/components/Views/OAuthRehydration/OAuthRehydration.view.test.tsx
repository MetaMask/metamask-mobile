import '../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  oauthRehydrationViewMocks,
  renderOAuthRehydrationView,
  renderOAuthRehydrationViewWithRoutes,
  resetOAuthRehydrationViewMocks,
} from '../../../../tests/component-view/renderers/oauthRehydration';
import { LoginViewSelectors } from '../Login/LoginView.testIds';
import Routes from '../../../constants/navigation/Routes';

const RootModalFlowProbe = () => {
  const route =
    useRoute<RouteProp<Record<string, { screen?: string }>, string>>();

  return (
    <Text testID="root-modal-flow-probe">
      {route.params?.screen ?? 'unknown'}
    </Text>
  );
};

describeForPlatforms('OAuthRehydration', () => {
  beforeEach(() => {
    resetOAuthRehydrationViewMocks();
  });

  it('renders the normal branch and enables unlock after entering a password', () => {
    const { getByTestId, queryByTestId } = renderOAuthRehydrationView();

    const passwordInput = getByTestId(LoginViewSelectors.PASSWORD_INPUT);
    const unlockButton = getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID);

    expect(
      getByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON),
    ).toBeOnTheScreen();
    expect(unlockButton).toBeDisabled();
    expect(queryByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeNull();

    fireEvent.changeText(passwordInput, 'validPassword123');

    expect(unlockButton).not.toBeDisabled();
  });

  it('shows the inline password error after a failed unlock attempt', async () => {
    oauthRehydrationViewMocks.unlockWallet.mockRejectedValueOnce(
      new Error('Decrypt failed'),
    );

    const { getByTestId } = renderOAuthRehydrationView();

    fireEvent.changeText(
      getByTestId(LoginViewSelectors.PASSWORD_INPUT),
      'wrongPassword',
    );
    fireEvent.press(getByTestId(LoginViewSelectors.LOGIN_BUTTON_ID));

    await waitFor(() => {
      expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeOnTheScreen();
    });
  });

  it('renders the outdated-password branch and opens the delete wallet modal', async () => {
    const { getByTestId, queryByTestId, findByTestId } =
      renderOAuthRehydrationViewWithRoutes({
        initialParams: {
          isSeedlessPasswordOutdated: true,
        },
        extraRoutes: [
          {
            name: Routes.MODAL.ROOT_MODAL_FLOW,
            Component: RootModalFlowProbe,
          },
        ],
      });

    expect(getByTestId(LoginViewSelectors.RESET_WALLET)).toBeOnTheScreen();
    expect(queryByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON)).toBeNull();
    expect(getByTestId(LoginViewSelectors.PASSWORD_ERROR)).toBeOnTheScreen();

    fireEvent.press(getByTestId(LoginViewSelectors.RESET_WALLET));

    const modalProbe = await findByTestId('root-modal-flow-probe');
    expect(modalProbe).toHaveTextContent(Routes.MODAL.DELETE_WALLET);
  });

  it('resets oauth state when the alternate login method CTA is pressed', () => {
    const { getByTestId } = renderOAuthRehydrationView();

    fireEvent.press(getByTestId(LoginViewSelectors.OTHER_METHODS_BUTTON));

    expect(oauthRehydrationViewMocks.resetOauthState).toHaveBeenCalledTimes(1);
  });
});
