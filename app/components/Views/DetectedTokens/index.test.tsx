import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import DetectedTokens from '.';
import {
  selectAllDetectedTokensFlat,
  selectDetectedTokens,
} from '../../../selectors/tokensController';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { ThemeContext } from '../../../util/theme';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
  })),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: '#fff' },
      border: { default: '#ccc' },
      text: { default: '#000' },
      primary: { default: '#f00' },
    },
  })),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => <>{children}</>),
  }),
);

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(),
      })),
    })),
  })),
}));

jest.mock('../../UI/TokenImage', () => () => null);

jest.mock('../../UI/AssetOverview/Balance/Balance', () => ({
  // Mock other exports if needed, or leave empty
  __esModule: true,
  NetworkBadgeSource: jest.fn(() => 'mocked-network-badge-source'),
}));

const mockTheme = {
  colors: {
    background: { default: 'white' },
    border: { default: 'red' },
    text: { default: 'black' },
    error: { default: 'red' },
    warning: { default: 'yellow' },
    primary: { default: 'blue', inverse: 'orange' },
    overlay: { inverse: 'blue' },
  },
  themeAppearance: 'light',
};

describe('DetectedTokens Component', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectDetectedTokens) {
        return [
          { address: '0xToken1', symbol: 'TKN1', chainId: '1' },
          { address: '0xToken2', symbol: 'TKN2', chainId: '1' },
        ];
      }
      if (selector === selectSelectedInternalAccountAddress) return '0xAccount';
      if (selector === selectTokensBalances)
        return {
          '0xAccount': { '1': '1000000000000000000' }, // 1 token
        };
      if (selector === selectAllDetectedTokensFlat) {
        return [
          { address: '0xToken1', symbol: 'TKN1', chainId: '1' },
          { address: '0xToken2', symbol: 'TKN2', chainId: '1' },
        ];
      }
      if (selector === selectEvmChainId) return '1';
      if (selector === selectEvmNetworkConfigurationsByChainId) return {};
      return {};
    });
  });

  it('renders correctly with detected tokens', () => {
    const { getByText, toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <DetectedTokens />
      </ThemeContext.Provider>,
    );

    expect(getByText('2 new tokens found')).toBeTruthy();
    expect(getByText('0 TKN1')).toBeTruthy();
    expect(getByText('0 TKN2')).toBeTruthy();
    expect(getByText('Import (2)')).toBeTruthy();

    // Snapshot test
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when no detected tokens', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectDetectedTokens) return [];
      if (selector === selectAllDetectedTokensFlat) return [];
      if (selector === selectEvmChainId) return '1';
      if (selector === selectEvmNetworkConfigurationsByChainId) return {};
      return {};
    });

    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <DetectedTokens />
      </ThemeContext.Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to confirmation on "Hide All" button press', () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <DetectedTokens />
      </ThemeContext.Provider>,
    );

    const hideAllButton = getByText('Hide all');
    fireEvent.press(hideAllButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'DetectedTokensConfirmation',
      expect.objectContaining({ isHidingAll: true }),
    );
  });
});
