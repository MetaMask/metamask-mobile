import React from 'react';
import UnstakeConfirmationView from './UnstakeConfirmationView';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Image, ImageSize } from 'react-native';
import { createMockAccountsControllerState } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { UnstakeConfirmationViewProps } from './UnstakeConfirmationView.types';
import { MOCK_POOL_STAKING_SDK } from '../../__mocks__/mockData';

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

jest.mock('../../../../hooks/useIpfsGateway', () => jest.fn());

Image.getSize = jest.fn(
  (
    _uri: string,
    success?: (width: number, height: number) => void,
    _failure?: (error: Error) => void,
  ) => {
    if (success) {
      success(100, 100);
    }
    return Promise.resolve<ImageSize>({ width: 100, height: 100 });
  },
);
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});

jest.mock('../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: () => ({
    attemptDepositTransaction: jest.fn(),
  }),
}));

jest.mock('../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    refreshPooledStakes: jest.fn(),
  }),
}));

jest.mock('../../hooks/useStakeContext', () => ({
  __esModule: true,
  useStakeContext: jest.fn(() => MOCK_POOL_STAKING_SDK),
}));

describe('UnstakeConfirmationView', () => {
  it('render matches snapshot', () => {
    const props: UnstakeConfirmationViewProps = {
      route: {
        key: '1',
        name: 'params',
        params: {
          amountWei: '4999820000000000000',
          amountFiat: '12894.52',
        },
      },
    };

    const { toJSON } = renderWithProvider(
      <UnstakeConfirmationView {...props} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
