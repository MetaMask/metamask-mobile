import React from 'react';
import { act } from '@testing-library/react-native';
import PermissionsSummary from './PermissionsSummary';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockedNavigate = jest.fn();

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockedNavigate,
      navigate: mockedNavigate,
    }),
  };
});

// Mock React Native Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
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

  it('should keep original hostname when url in store changes', async () => {
    const maliciousOriginalURL = 'https://malicious.site'
    const maliciousHostname = new URL(maliciousOriginalURL).hostname
    const safeURL = 'https://portfolio.metamask.io/'
    const safeHostname = new URL(safeURL).hostname
    const { toJSON, rerender } = renderWithProvider(
      <PermissionsSummary
        currentPageInformation={{
          currentEnsName: '',
          icon: '',
          url: maliciousOriginalURL,
        }}
      />,
      { state: mockInitialState },
    );
    const originalHostnameSyntax = toJSON().children[0].children[0].children[1].children[0].children[0]
    expect(originalHostnameSyntax.includes(maliciousHostname)).toBe(true);
    // now change the url for that same instance and change the URL
    // use act to rerender
    await act(async () => {
      rerender(
        <PermissionsSummary
          currentPageInformation={{
            currentEnsName: '',
            icon: '',
            url: safeURL,
          }}
        />,
      );
    });
    const newHostnameSyntax = toJSON().children[0].children[0].children[1].children[0].children[0]
    expect(newHostnameSyntax.includes(safeHostname)).toBe(false);
    expect(newHostnameSyntax.includes(maliciousHostname)).toBe(true);
  });
});
