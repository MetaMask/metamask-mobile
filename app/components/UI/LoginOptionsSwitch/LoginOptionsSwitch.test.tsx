import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import LoginOptionsSwitch from './LoginOptionsSwitch';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    if (key === 'biometrics.enable_face') {
      return 'Enable Face ID';
    }
    if (key === 'biometrics.enable_touch') {
      return 'Enable Touch ID';
    }
    if (key === 'biometrics.enable_touchid') {
      return 'Enable Touch ID';
    }
    return key;
  }),
}));

describe('LoginOptionsSwitch', () => {
  const mockStore = configureMockStore();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleUpdate = (_biometricsEnabled: boolean) => {};

  it('should render correctly with Face ID option', async () => {
    const store = mockStore({
      engine: {
        backgroundState: {
          PreferencesController: {
            biometryChoice: true,
          },
        },
      },
      security: {
        allowLoginWithRememberMe: true,
      },
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
      expect(screen.getByText(/enable face/i)).toBeTruthy();
      expect(screen.getByTestId('login-with-biometrics-switch')).toBeTruthy();
    });
  });

  it('should not render biometric option when shouldRenderBiometricOption is null', async () => {
    const store = mockStore({
      engine: {
        backgroundState: {
          PreferencesController: {
            biometryChoice: true,
          },
        },
      },
      security: {
        allowLoginWithRememberMe: true,
      },
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
      expect(screen.queryByText(/enable (face|touch)/i)).toBeNull();
      expect(screen.getByTestId('remember-me-switch')).toBeTruthy();
    });
  });

  it('should render correctly with Touch ID option', async () => {
    const store = mockStore({
      engine: {
        backgroundState: {
          PreferencesController: {
            biometryChoice: true,
          },
        },
      },
      security: {
        allowLoginWithRememberMe: true,
      },
    });
    const { toJSON } = render(
      <Provider store={store}>
        <LoginOptionsSwitch
          shouldRenderBiometricOption={BIOMETRY_TYPE.TOUCH_ID}
          biometryChoiceState
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
    await waitFor(() => {
      expect(screen.getByText(/enable touch/i)).toBeTruthy();
      expect(screen.getByTestId('login-with-biometrics-switch')).toBeTruthy();
    });
  });
});
