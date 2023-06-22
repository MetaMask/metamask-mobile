import { shallow } from 'enzyme';
import React from 'react';
import EthSignFriction from './EthSignFriction';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';

const mockEngine = Engine;

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

describe('Eth_sign friction bottom sheet', () => {
  it('should render initial friction step correctly', () => {
    const wrapper = shallow(<EthSignFriction />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should have checkbox and textfield unlocking steps', async () => {
    const {
      queryAllByText,
      queryAllByRole,
      getByRole,
      getByAccessibilityHint,
    } = renderWithProvider(<EthSignFriction />, {
      state: {},
    });

    // test if cancel button triggers navigation goBack
    const cancelButton = getByRole('button', {
      name: strings('navigation.cancel'),
    });
    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalled();

    // test if readMore link triggers navigation to webview
    const learMoreLink = getByRole('link', {
      name: strings('app_settings.toggleEthSignModalLearnMore'),
    });
    fireEvent.press(learMoreLink);
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.WHAT_IS_ETH_SIGN_AND_WHY_IS_IT_A_RISK,
        title: strings('app_settings.enable_eth_sign'),
      },
    });

    // expect the checkbox with associated label and continue button to be present
    expect(
      queryAllByText(strings('app_settings.toggleEthSignModalCheckBox')).length,
    ).toBe(1);

    const checkbox = getByRole('checkbox');

    const continueButton = getByRole('button', {
      name: strings('app_settings.toggleEthSignContinueButton'),
    });

    // Initially disabled continue button
    expect(continueButton.props.disabled).toBeTruthy();

    // Check the checkbox to enable continue button
    fireEvent.press(checkbox);
    expect(continueButton.props.disabled).toBeFalsy();

    // press continue button to move to step 2
    fireEvent.press(continueButton);

    // expect the continue button to be disabled again and text changed to 'enable'
    // as the bottom sheet changed to the second step
    const enableButton = getByRole('button', {
      name: strings('app_settings.toggleEthSignEnableButton'),
    });
    expect(enableButton.props.disabled).toBeTruthy();

    // Check the checkbox and continue button are gone
    expect(queryAllByRole('checkbox').length).toBe(0);
    expect(
      queryAllByRole('button', {
        name: strings('app_settings.toggleEthSignContinueButton'),
      }).length,
    ).toBe(0);

    // expect the textfield to be present
    const textField = getByAccessibilityHint(
      strings('app_settings.toggleEthSignModalFormLabel'),
    );

    // type the wrong text
    fireEvent(textField, 'onEndEditing', {
      nativeEvent: { text: 'not the right text' },
    });
    expect(enableButton.props.disabled).toBeTruthy();

    // type the write text
    fireEvent(textField, 'onEndEditing', {
      nativeEvent: { text: 'i only sign what i understand' },
    });
    expect(enableButton.props.disabled).toBeFalsy();
  });
});
