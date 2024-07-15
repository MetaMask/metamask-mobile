import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import LoginOptionsSwitch from './LoginOptionsSwitch';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

describe('LoginOptionsSwitch', () => {
  const mockStore = configureMockStore();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleUpdate = (_biometricsEnabled: boolean) => {};

  it('should render correctly with biometric option', async () => {
    const store = mockStore({
      security: {
        allowLoginWithRememberMe: false
      }
    });
    const { toJSON } = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          shouldRenderBiometricOption={BIOMETRY_TYPE.FACE}
          biometryChoiceState
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
    await waitFor(() => {
      expect(screen.getByText('[missing "en.biometrics.enable_face" translation]')).toBeTruthy();
      expect(screen.getByTestId('remember-me-switch')).toBeTruthy();
    });
  });

  it('should not render biometric option when shouldRenderBiometricOption is null', async () => {
    const store = mockStore({
      security: {
        allowLoginWithRememberMe: false
      }
    });
    const { toJSON } = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
          biometryChoiceState
          shouldRenderBiometricOption={null}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
    await waitFor(() => {
      expect(screen.queryByText('[missing "en.biometrics.enable_face" translation]')).toBeNull();
      expect(screen.getByTestId('remember-me-switch')).toBeTruthy();
    });
  });
});