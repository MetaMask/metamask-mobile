import React from 'react';
import PermissionsSummary from './PermissionsSummary';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockedNavigate,
    }),
  };
});

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('PermissionsSummary', () => {
  it('should render correctly for network switch', () => {
    const { toJSON } = renderWithProvider(
      <PermissionsSummary
        currentPageInformation={{
          currentEnsName: '',
          icon: '',
          url: 'https://app.uniswap.org/',
        }}
        customNetworkInformation={{
          chainName: 'Sepolia',
          chainId: '0x1',
        }}
        isNetworkSwitch
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <PermissionsSummary
        currentPageInformation={{
          currentEnsName: '',
          icon: '',
          url: 'https://app.uniswap.org/',
        }}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
