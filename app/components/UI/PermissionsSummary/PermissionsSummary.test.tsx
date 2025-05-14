import React from 'react';
import PermissionsSummary from './PermissionsSummary';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockedNavigate = jest.fn();

// Mock useSelectedAccount hook
jest.mock('../Tabs/TabThumbnail/useSelectedAccount', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    name: 'Account 2',
    address: '0x0',
    isSelected: true,
    assets: {
      fiatBalance: '$3200',
    },
  }),
}));

// Mock useAccounts hook
jest.mock('../../../components/hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockReturnValue({
    accounts: [
      {
        name: 'Account 2',
        address: '0x0',
        isSelected: true,
        assets: {
          fiatBalance: '$3200',
        },
      },
    ],
    evmAccounts: [
      {
        name: 'Account 2',
        address: '0x0',
        isSelected: true,
        assets: {
          fiatBalance: '$3200',
        },
      },
    ],
    ensByAccountAddress: {},
  }),
}));

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
