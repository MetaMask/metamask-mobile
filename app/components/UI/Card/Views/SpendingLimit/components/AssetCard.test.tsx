import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import AssetCard, { AssetCardProps } from './AssetCard';
import { buildTokenIconUrl } from '../../../util/buildTokenIconUrl';
import { LINEA_CAIP_CHAIN_ID } from '../../../util/buildTokenList';

jest.mock('../../../util/buildTokenIconUrl', () => ({
  buildTokenIconUrl: jest.fn(
    (chainId: string, address: string) =>
      `https://icon.url/${chainId}/${address}`,
  ),
}));

jest.mock('../../../util/safeFormatChainIdToHex', () => ({
  safeFormatChainIdToHex: jest.fn(() => '0xe708'),
}));

jest.mock('../../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://network-badge.url' })),
}));

const mockBuildTokenIconUrl = buildTokenIconUrl as jest.MockedFunction<
  typeof buildTokenIconUrl
>;

const defaultProps: AssetCardProps = {
  symbol: 'USDC',
  tokenAddress: '0x1234567890',
  isSelected: false,
  onPress: jest.fn(),
  testID: 'asset-card-usdc',
};

const render = (props: Partial<AssetCardProps> = {}) => {
  const Component = () => <AssetCard {...defaultProps} {...props} />;
  return renderScreen(
    Component,
    { name: 'AssetCard', options: {} },
    {
      state: {
        engine: {
          backgroundState: {
            PreferencesController: {
              isIpfsGatewayEnabled: true,
            },
          },
        },
      },
    },
  );
};

describe('AssetCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders token symbol text', () => {
      render();

      expect(screen.getByText('USDC')).toBeOnTheScreen();
    });

    it('renders with testID when provided', () => {
      render({ testID: 'asset-card-test' });

      expect(screen.getByTestId('asset-card-test')).toBeOnTheScreen();
    });

    it('renders token avatar for non-other options', () => {
      render({ isOther: false, tokenAddress: '0xtoken123' });

      expect(screen.getByTestId('token-avatar-image')).toBeOnTheScreen();
    });

    it('renders network badge for non-other options', () => {
      render({ isOther: false, tokenAddress: '0xtoken123' });

      expect(screen.getByTestId('badge-wrapper-badge')).toBeOnTheScreen();
    });

    it('renders icon for "Other" option', () => {
      render({ isOther: true, symbol: 'Other' });

      expect(screen.getByText('Other')).toBeOnTheScreen();
    });

    it('does not render token avatar for "Other" option', () => {
      render({ isOther: true, symbol: 'Other' });

      expect(screen.queryByTestId('token-avatar-image')).toBeNull();
    });
  });

  describe('Token Icon URL', () => {
    it('builds icon URL using tokenAddress', () => {
      const tokenAddress = '0xTokenAddress123';

      render({ tokenAddress, isOther: false });

      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        LINEA_CAIP_CHAIN_ID,
        tokenAddress,
      );
    });

    it('builds icon URL using stagingTokenAddress as fallback', () => {
      const stagingTokenAddress = '0xStagingAddress456';

      render({
        tokenAddress: undefined,
        stagingTokenAddress,
        isOther: false,
      });

      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        LINEA_CAIP_CHAIN_ID,
        stagingTokenAddress,
      );
    });

    it('prefers tokenAddress over stagingTokenAddress', () => {
      const tokenAddress = '0xTokenAddress123';
      const stagingTokenAddress = '0xStagingAddress456';

      render({
        tokenAddress,
        stagingTokenAddress,
        isOther: false,
      });

      expect(mockBuildTokenIconUrl).toHaveBeenCalledWith(
        LINEA_CAIP_CHAIN_ID,
        tokenAddress,
      );
    });

    it('does not build icon URL for "Other" option', () => {
      render({ isOther: true, tokenAddress: '0xtoken' });

      expect(mockBuildTokenIconUrl).not.toHaveBeenCalled();
    });

    it('does not build icon URL when no address provided', () => {
      render({
        tokenAddress: undefined,
        stagingTokenAddress: undefined,
        isOther: false,
      });

      expect(mockBuildTokenIconUrl).not.toHaveBeenCalled();
    });
  });

  describe('Selection State', () => {
    it('renders with selected styling when isSelected is true', () => {
      render({ isSelected: true });

      // Component renders without errors in selected state
      expect(screen.getByText('USDC')).toBeOnTheScreen();
    });

    it('renders with unselected styling when isSelected is false', () => {
      render({ isSelected: false });

      // Component renders without errors in unselected state
      expect(screen.getByText('USDC')).toBeOnTheScreen();
    });
  });

  describe('Interaction', () => {
    it('calls onPress when card is pressed', () => {
      const mockOnPress = jest.fn();

      render({ onPress: mockOnPress, testID: 'asset-card' });

      const card = screen.getByTestId('asset-card');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress for selected card', () => {
      const mockOnPress = jest.fn();

      render({ onPress: mockOnPress, isSelected: true, testID: 'asset-card' });

      const card = screen.getByTestId('asset-card');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress for "Other" option', () => {
      const mockOnPress = jest.fn();

      render({
        onPress: mockOnPress,
        isOther: true,
        symbol: 'Other',
        testID: 'asset-card-other',
      });

      const card = screen.getByTestId('asset-card-other');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Different Token Symbols', () => {
    it('renders mUSD symbol', () => {
      render({ symbol: 'mUSD' });

      expect(screen.getByText('mUSD')).toBeOnTheScreen();
    });

    it('renders ETH symbol', () => {
      render({ symbol: 'ETH' });

      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });

    it('renders USDT symbol', () => {
      render({ symbol: 'USDT' });

      expect(screen.getByText('USDT')).toBeOnTheScreen();
    });
  });
});
