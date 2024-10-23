import React from 'react';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../../locales/i18n';
import FooterButtonGroup from './FooterButtonGroup';
import { fireEvent } from '@testing-library/react-native';
import {
  FooterButtonGroupActions,
  FooterButtonGroupProps,
} from './FooterButtonGroup.types';
import { createMockAccountsControllerState } from '../../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockCanGoBack = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: () => ({
    poolStakingContract: {},
    estimateDepositGas: jest.fn(),
    attemptDepositTransaction: jest.fn(),
  }),
}));

describe('FooterButtonGroup', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('render matches snapshot', () => {
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    expect(getByText(strings('stake.cancel'))).toBeDefined();
    expect(getByText(strings('stake.confirm'))).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to Asset page when cancel is pressed', () => {
    mockCanGoBack.mockImplementationOnce(() => true);
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText(strings('stake.cancel')));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Asset');

    expect(toJSON()).toMatchSnapshot();
  });

  it.todo('confirms stake when confirm button is pressed');
});
