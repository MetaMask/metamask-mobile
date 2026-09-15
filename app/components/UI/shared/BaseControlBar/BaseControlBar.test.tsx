import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import BaseControlBar, { BaseControlBarProps } from './BaseControlBar';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useNavigation } from '@react-navigation/native';
import { ButtonIcon, SelectButton } from '@metamask/design-system-react-native';

jest.mock('../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: jest.fn(),
}));

jest.mock('../../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../Tokens/TokenSortBottomSheet/TokenSortBottomSheet', () => ({
  createTokensBottomSheetNavDetails: jest.fn(() => ['TokensBottomSheet', {}]),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const stableNullAccountSelector = () => null;
  return {
    selectSelectedInternalAccountByScope: () => stableNullAccountSelector,
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('@metamask/keyring-api', () => ({
  SolScope: {
    Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
}));

jest.mock('../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      actionBarWrapper: {},
      controlButtonOuterWrapper: {},
      controlButtonInnerWrapper: {},
    },
  })),
}));

const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockUseNetworkEnablement = useNetworkEnablement as jest.MockedFunction<
  typeof useNetworkEnablement
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('BaseControlBar', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };
  const mockEnableAllPopularNetworks = jest.fn();

  const defaultProps: BaseControlBarProps = {
    networkFilterTestId: 'test-network-filter',
    onFilterPress: jest.fn(),
    networkLabel: 'Popular Networks',
    networkAvatar: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
    mockUseCurrentNetworkInfo.mockReturnValue({
      enabledNetworks: [{ chainId: '0x1' }, { chainId: '0x89' }],
    } as unknown as ReturnType<typeof useCurrentNetworkInfo>);
    mockUseNetworkEnablement.mockReturnValue({
      enableAllPopularNetworks: mockEnableAllPopularNetworks,
    } as unknown as ReturnType<typeof useNetworkEnablement>);
  });

  const renderComponent = (props: Partial<BaseControlBarProps> = {}) =>
    render(<BaseControlBar {...defaultProps} {...props} />);

  describe('Basic rendering', () => {
    it('renders with network filter button', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('test-network-filter')).toBeTruthy();
    });

    it('renders with sort button', () => {
      const sortButtons = renderComponent().UNSAFE_getAllByType(ButtonIcon);
      expect(sortButtons.length).toBeGreaterThan(0);
    });

    it('renders additional buttons when provided', () => {
      const additionalButton = (
        <Text testID="additional-button">Add Token</Text>
      );
      const { getByTestId } = renderComponent({
        additionalButtons: additionalButton,
      });
      expect(getByTestId('additional-button')).toBeTruthy();
    });

    it('does not render sort button when hideSort is true', () => {
      const { UNSAFE_queryAllByType } = renderComponent({ hideSort: true });
      expect(UNSAFE_queryAllByType(ButtonIcon)).toHaveLength(0);
    });
  });

  describe('Network label/avatar', () => {
    it('renders the provided networkLabel', () => {
      const { getByText } = renderComponent({
        networkLabel: 'Ethereum Mainnet',
      });
      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('does not render an avatar when networkAvatar is null', () => {
      const { UNSAFE_getAllByType } = renderComponent({
        networkAvatar: null,
      });
      const selectButtons = UNSAFE_getAllByType(SelectButton);
      expect(selectButtons[0].props.startAccessory).toBeUndefined();
    });

    it('renders the provided networkAvatar', () => {
      const avatar = <Text testID="network-avatar">avatar</Text>;
      const { getByTestId } = renderComponent({ networkAvatar: avatar });
      expect(getByTestId('network-avatar')).toBeTruthy();
    });
  });

  describe('Button interactions', () => {
    it('calls onFilterPress when the filter button is pressed', () => {
      const onFilterPress = jest.fn();
      const { getByTestId } = renderComponent({ onFilterPress });
      const filterButton = getByTestId('test-network-filter');

      fireEvent.press(filterButton);

      expect(onFilterPress).toHaveBeenCalled();
    });

    it('calls default sort handler when no custom handler provided', () => {
      const { UNSAFE_getAllByType } = renderComponent();
      const buttonIcons = UNSAFE_getAllByType(ButtonIcon);
      const sortButton = buttonIcons[0];

      fireEvent.press(sortButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'TokensBottomSheet',
        {},
      );
    });

    it('calls custom sort handler when provided', () => {
      const customSortHandler = jest.fn();
      const { UNSAFE_getAllByType } = renderComponent({
        onSortPress: customSortHandler,
      });
      const buttonIcons = UNSAFE_getAllByType(ButtonIcon);
      const sortButton = buttonIcons[0];

      fireEvent.press(sortButton);

      expect(customSortHandler).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Disabled states', () => {
    it('renders filter button as enabled when no custom isDisabled param is provided', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('test-network-filter')).toBeEnabled();
    });

    it('respects custom isDisabled param when provided', () => {
      const { getByTestId } = renderComponent({ isDisabled: true });
      expect(getByTestId('test-network-filter')).toBeDisabled();
    });
  });

  describe('Custom wrapper layouts', () => {
    it('renders with outer wrapper by default', () => {
      const { getByTestId } = renderComponent();
      expect(getByTestId('test-network-filter')).toBeTruthy();
    });

    it('renders without outer wrapper when customWrapper is "none"', () => {
      const { getByTestId } = renderComponent({ customWrapper: 'none' });
      expect(getByTestId('test-network-filter')).toBeTruthy();
    });
  });

  describe('Solana safety net', () => {
    it('re-enables all popular networks when only Solana is enabled and no Solana account is selected', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
        ],
      } as unknown as ReturnType<typeof useCurrentNetworkInfo>);

      renderComponent();

      expect(mockEnableAllPopularNetworks).toHaveBeenCalled();
    });

    it('does not re-enable all popular networks when multiple networks are enabled', () => {
      renderComponent();

      expect(mockEnableAllPopularNetworks).not.toHaveBeenCalled();
    });
  });
});
