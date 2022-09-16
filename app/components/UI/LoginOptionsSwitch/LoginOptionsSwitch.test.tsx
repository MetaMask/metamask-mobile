import React from 'react';
import { shallow } from 'enzyme';
import LoginOptionsSwitch from './LoginOptionsSwitch';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
describe('LoginWithBiometricsSwitch', () => {
  const mockStore = configureMockStore();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const handleUpdate = (_biometricsEnabled: boolean) => {};
  it('should render correctly', () => {
    const store = mockStore({});
    const wrapper = shallow(
      <Provider store={store}>
        <LoginOptionsSwitch
          shouldRenderBiometricOption={BIOMETRY_TYPE.FACE}
          biometryChoiceState
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should return empty object when shouldRenderBiometricOption is undefined and allowLoginWithRememberMe is false in settings', () => {
    const store = mockStore({});
    const wrapper = shallow(
      <Provider store={store}>
        <LoginOptionsSwitch
          onUpdateBiometryChoice={handleUpdate}
          onUpdateRememberMe={handleUpdate}
          biometryChoiceState
        />
      </Provider>,
    );
    expect(wrapper).toMatchObject({});
  });
});
