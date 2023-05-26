import { shallow } from 'enzyme';
import React from 'react';
import EthSignFriction from './EthSignFriction';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID} from "./EthSignFriction.testIds";

const mockEngine = Engine;

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('Eth_sign friction bottom sheet', () => {
  it('should render initial friction step correctly', () => {
    const wrapper = shallow(<EthSignFriction />);
    expect(wrapper).toMatchSnapshot();
  });

  it.only('should have checkbox and textfield unlocking steps', async () => {
    const { debug, getAllByText, queryAllByRole, getByRole, getByTestId } = renderWithProvider(
      <EthSignFriction />,
      {
        state: {},
      },
    );

    expect(
      getAllByText(strings('app_settings.toggleEthSignModalCheckBox')).length,
    ).toBe(1);
    expect(
      getAllByText(strings('app_settings.toggleEthSignContinueButton')).length,
    ).toBe(1);

    const continueButton = getByRole('button',
      {name: strings('app_settings.toggleEthSignContinueButton')}
    );

    // Initially disabled continue button
    expect(continueButton.props.disabled).toBeTruthy();

    // Check the checkbox to enable continue button
    fireEvent(getByRole('checkbox'), 'onValueChange', true);
    expect(continueButton.props.disabled).toBeFalsy();

    // press continue button to move to step 2
    fireEvent.press(continueButton);

    // expect the continue button to be disabled again and text changed to 'enable'
    // as the bottom sheet changed to the second step
    const enableButton = getByRole('button',
      {name: strings('app_settings.toggleEthSignEnableButton')}
    );
    expect(enableButton.props.disabled).toBeTruthy();

    // Check the checkbox and continue button are gone
    expect(queryAllByRole('checkbox').length).toBe(0);
    expect(queryAllByRole('button', {name: strings('app_settings.toggleEthSignContinueButton')} ).length).toBe(0);

    debug();

    const textField = getByTestId(ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID);
    expect(enableButton.props.value).toBe('');// initially empty


  });
});
