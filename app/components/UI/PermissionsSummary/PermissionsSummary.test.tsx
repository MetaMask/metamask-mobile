import React from 'react';
import PermissionsSummary from './PermissionsSummary';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

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

jest.mock('react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

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
        accounts={[]}
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
        accounts={[
          {
            name: 'Account 2',
            address: '0x2',
            isSelected: true,
            assets: {
              fiatBalance: '$3200',
            },
            caipAccountId: 'eip155:0:0x2',
            yOffset: 0,
            type: KeyringTypes.simple,
          },
        ]}
        accountAddresses={['eip155:0:0x2']}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
