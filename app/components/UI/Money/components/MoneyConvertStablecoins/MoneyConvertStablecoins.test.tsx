import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyConvertStablecoins from './MoneyConvertStablecoins';
import { MoneyConvertStablecoinsTestIds } from './MoneyConvertStablecoins.testIds';
import { strings } from '../../../../../../locales/i18n';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { ConvertTokenRowTestIds } from '../../../Earn/components/Musd/ConvertTokenRow';

jest.mock('../../../../../component-library/base-components/TagBase', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock(
  '../../../../../component-library/components/Avatars/AvatarGroup',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View testID="avatar-group" />,
    };
  },
);

jest.mock('../../../Earn/components/Musd/ConvertTokenRow', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  const MockConvertTokenRow = ({
    token,
    onMaxPress,
    onEditPress,
  }: {
    token: { symbol: string };
    onMaxPress: (t: unknown) => void;
    onEditPress: (t: unknown) => void;
  }) => (
    <TouchableOpacity testID="convert-token-row-container">
      <Text testID="convert-token-row-token-name">{token.symbol}</Text>
      <TouchableOpacity
        testID="convert-token-row-max-button"
        onPress={() => onMaxPress(token)}
      />
      <TouchableOpacity
        testID="convert-token-row-edit-button"
        onPress={() => onEditPress(token)}
      />
    </TouchableOpacity>
  );
  MockConvertTokenRow.displayName = 'ConvertTokenRow';
  return {
    __esModule: true,
    default: MockConvertTokenRow,
    ConvertTokenRowTestIds: {
      CONTAINER: 'convert-token-row-container',
      TOKEN_NAME: 'convert-token-row-token-name',
      MAX_BUTTON: 'convert-token-row-max-button',
      EDIT_BUTTON: 'convert-token-row-edit-button',
    },
  };
});

const MOCK_USDC: AssetType = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$5,000.00',
} as AssetType;

const MOCK_USDT: AssetType = {
  name: 'Tether',
  symbol: 'USDT',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: '0x1',
  decimals: 6,
  balanceInSelectedCurrency: '$4,000.00',
} as AssetType;

const MOCK_DAI: AssetType = {
  name: 'Dai',
  symbol: 'DAI',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  chainId: '0x1',
  decimals: 18,
  balanceInSelectedCurrency: '$1,000.00',
} as AssetType;

const mockTokens: AssetType[] = [MOCK_USDC, MOCK_USDT, MOCK_DAI];

const defaultProps = {
  tokens: mockTokens,
  onMaxPress: jest.fn(),
  onEditPress: jest.fn(),
  onLearnMorePress: jest.fn(),
};

describe('MoneyConvertStablecoins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with eligible tokens', () => {
    it('renders the container', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the convert title', () => {
      const { getByText } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(
        getByText(strings('money.convert_stablecoins.title')),
      ).toBeOnTheScreen();
    });

    it('renders the description with bonus text', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.DESCRIPTION),
      ).toBeOnTheScreen();
    });

    it('renders feature tags', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.FEATURE_TAGS),
      ).toBeOnTheScreen();
    });

    it('renders a ConvertTokenRow for each token', () => {
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      const rows = getAllByTestId(ConvertTokenRowTestIds.CONTAINER);
      expect(rows).toHaveLength(3);
    });

    it('renders token symbols', () => {
      const { getByText } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(getByText('USDC')).toBeOnTheScreen();
      expect(getByText('USDT')).toBeOnTheScreen();
      expect(getByText('DAI')).toBeOnTheScreen();
    });

    it('renders the Learn more button', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.LEARN_MORE_CTA),
      ).toBeOnTheScreen();
    });

    it('calls onLearnMorePress when Learn more is pressed', () => {
      const mockLearnMore = jest.fn();
      const { getByTestId } = render(
        <MoneyConvertStablecoins
          {...defaultProps}
          onLearnMorePress={mockLearnMore}
        />,
      );

      fireEvent.press(
        getByTestId(MoneyConvertStablecoinsTestIds.LEARN_MORE_CTA),
      );

      expect(mockLearnMore).toHaveBeenCalledTimes(1);
    });

    it('calls onMaxPress with token when Max is pressed', () => {
      const mockMaxPress = jest.fn();
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins {...defaultProps} onMaxPress={mockMaxPress} />,
      );

      const maxButtons = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON);
      fireEvent.press(maxButtons[0]);

      expect(mockMaxPress).toHaveBeenCalledWith(MOCK_USDC);
    });

    it('calls onEditPress with token when Edit is pressed', () => {
      const mockEditPress = jest.fn();
      const { getAllByTestId } = render(
        <MoneyConvertStablecoins
          {...defaultProps}
          onEditPress={mockEditPress}
        />,
      );

      const editButtons = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON);
      fireEvent.press(editButtons[1]);

      expect(mockEditPress).toHaveBeenCalledWith(MOCK_USDT);
    });
  });

  describe('without eligible tokens', () => {
    const infoProps = {
      ...defaultProps,
      tokens: [],
    };

    it('renders the container', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the convert title', () => {
      const { getByText } = render(<MoneyConvertStablecoins {...infoProps} />);

      expect(
        getByText(strings('money.convert_stablecoins.title')),
      ).toBeOnTheScreen();
    });

    it('renders stacked token icons', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.TOKEN_ICONS),
      ).toBeOnTheScreen();
    });

    it('renders the description', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.DESCRIPTION),
      ).toBeOnTheScreen();
    });

    it('renders feature tags', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.FEATURE_TAGS),
      ).toBeOnTheScreen();
    });

    it('does not render token rows', () => {
      const { queryByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(queryByTestId(ConvertTokenRowTestIds.CONTAINER)).toBeNull();
    });

    it('renders Learn more button', () => {
      const { getByTestId } = render(
        <MoneyConvertStablecoins {...infoProps} />,
      );

      expect(
        getByTestId(MoneyConvertStablecoinsTestIds.LEARN_MORE_CTA),
      ).toBeOnTheScreen();
    });
  });
});
