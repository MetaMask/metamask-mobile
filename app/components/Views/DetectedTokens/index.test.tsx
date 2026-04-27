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
import { DetectedTokensSelectorIDs } from './DetectedTokensView.testIds';

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

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => <>{children}</>),
  }),
);

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
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
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <DetectedTokens />
      </ThemeContext.Provider>,
    );

    expect(getByText('2 new tokens found')).toBeTruthy();
    expect(getByText('0 TKN1')).toBeTruthy();
    expect(getByText('0 TKN2')).toBeTruthy();
    expect(getByText('Import (2)')).toBeTruthy();
  });

  it('renders zero-token state with disabled import button', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectDetectedTokens) return [];
      if (selector === selectAllDetectedTokensFlat) return [];
      if (selector === selectEvmChainId) return '1';
      if (selector === selectEvmNetworkConfigurationsByChainId) return {};
      return {};
    });

    const { getByText, getByTestId } = render(
      <ThemeContext.Provider value={mockTheme}>
        <DetectedTokens />
      </ThemeContext.Provider>,
    );

    expect(getByText('0 new token found')).toBeTruthy();
    expect(getByText('Import (0)')).toBeTruthy();
    expect(
      getByTestId(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID).props.disabled,
    ).toBe(true);
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
