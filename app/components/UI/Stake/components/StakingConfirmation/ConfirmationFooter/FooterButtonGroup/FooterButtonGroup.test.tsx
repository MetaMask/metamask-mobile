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
import { MOCK_POOL_STAKING_SDK } from '../../../../__mocks__/mockData';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockSubscribeOnceIf = jest.fn();

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      controllerMessenger: {
        subscribeOnceIf: mockSubscribeOnceIf,
      },
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

jest.mock('../../../../hooks/useStakeContext', () => ({
  useStakeContext: () => MOCK_POOL_STAKING_SDK,
}));

const mockAttemptDepositTransaction = jest.fn();
const mockAttemptUnstakeTransaction = jest.fn();

jest.mock('../../../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: () => ({
    attemptDepositTransaction: mockAttemptDepositTransaction,
  }),
}));

jest.mock('../../../../hooks/usePoolStakedUnstake', () => ({
  __esModule: true,
  default: () => ({
    attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
  }),
}));

jest.mock('../../../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    refreshPooledStakes: jest.fn(),
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
    expect(getByText(strings('stake.continue'))).toBeDefined();

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

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it('attempts stake transaction on continue click', () => {
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText(strings('stake.continue')));

    expect(toJSON()).toMatchSnapshot();
    expect(mockAttemptDepositTransaction).toHaveBeenCalledTimes(1);
  });

  it('attempts unstake transaction on continue click', () => {
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.UNSTAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText(strings('stake.continue')));

    expect(toJSON()).toMatchSnapshot();
    expect(mockAttemptUnstakeTransaction).toHaveBeenCalledTimes(1);
  });
});
