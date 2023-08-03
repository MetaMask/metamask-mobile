import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import SecuritySettings from './SecuritySettings';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { CHANGE_PASSWORD_TITLE_ID } from '../../../../constants/test-ids';

const initialState = {
  privacy: { approvedHosts: {} },
  browser: { history: [] },
  settings: { lockTime: 1000 },
  user: { passwordSet: true },
  engine: {
    backgroundState: initialBackgroundState,
  },
  security: {
    allowLoginWithRememberMe: true,
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@react-native-cookies/cookies', () => ({
  clearAll: jest.fn(),
  getAll: jest.fn().mockResolvedValue({}),
}));

let mockUseParamsValues: {
  scrollToDetectNFTs?: boolean;
} = {
  scrollToDetectNFTs: undefined,
};

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('SecuritySettings', () => {
  beforeEach(() => {
    mockUseParamsValues = {
      scrollToDetectNFTs: undefined,
    };
  });
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<SecuritySettings />, {
      state: initialState,
    });
    expect(wrapper.toJSON()).toMatchSnapshot();
  });
  it('should render all sections', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SecuritySettings />,
      {
        state: initialState,
      },
    );
    expect(getByText('Protect your wallet')).toBeTruthy();
    expect(getByTestId(CHANGE_PASSWORD_TITLE_ID)).toBeTruthy();
    expect(getByTestId('auto-lock-section')).toBeTruthy();
    expect(getByTestId('login-options')).toBeTruthy();
    expect(getByTestId('turn-on-remember-me')).toBeTruthy();
    expect(getByTestId('reveal-private-key-section')).toBeTruthy();
    expect(getByTestId('sdk-section')).toBeTruthy();
    expect(getByTestId('clear-privacy-section')).toBeTruthy();
    expect(getByTestId('clear-browser-history-section')).toBeTruthy();
    expect(getByTestId('metametrics-section')).toBeTruthy();
    expect(getByTestId('delete-metrics-button')).toBeTruthy();
    expect(getByTestId('security-settings-delete-wallet-buttons')).toBeTruthy();
    expect(getByTestId('batch-balance-requests-section')).toBeTruthy();
    expect(getByTestId('third-party-section')).toBeTruthy();
    expect(getByTestId('nft-opensea-mode-section')).toBeTruthy();
    expect(getByTestId('nft-opensea-autodetect-mode-section')).toBeTruthy();
    expect(getByTestId('ipfs-gateway-section')).toBeTruthy();
    expect(getByText('Automatic security checks')).toBeTruthy();
  });
});
