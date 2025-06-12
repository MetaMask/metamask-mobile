import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionsFooter from './TransactionsFooter';
import { strings } from '../../../../locales/i18n';
import { NO_RPC_BLOCK_EXPLORER } from '../../../constants/network';

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#24272a',
      },
    },
    typography: {
      sBodySM: {
        fontSize: 14,
        lineHeight: 20,
      },
    },
  }),
}));

jest.mock('../../../util/networks', () => ({
  getBlockExplorerName: jest.fn(),
  isMainnetByChainId: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

jest.mock('../../../component-library/components/Buttons/Button', () => ({
  __esModule: true,
  default: ({
    label,
    onPress,
    testID,
  }: {
    label: string;
    onPress: () => void;
    testID?: string;
  }) => {
    const { Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  },
  ButtonVariants: { Link: 'link' },
  ButtonSize: { Lg: 'lg' },
}));

jest.mock('../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({
    children,
    style,
    testID,
  }: {
    children: React.ReactNode;
    style?: object;
    testID?: string;
  }) => {
    const { Text } = jest.requireActual('react-native');
    return (
      <Text style={style} testID={testID}>
        {children}
      </Text>
    );
  },
  getFontFamily: jest.fn(() => 'System'),
  TextVariant: { BodySM: 'BodySM' },
}));

import {
  getBlockExplorerName,
  isMainnetByChainId,
} from '../../../util/networks';

const mockGetBlockExplorerName = getBlockExplorerName as jest.MockedFunction<
  typeof getBlockExplorerName
>;
const mockIsMainnetByChainId = isMainnetByChainId as jest.MockedFunction<
  typeof isMainnetByChainId
>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('TransactionsFooter', () => {
  const mockOnViewBlockExplorer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStrings.mockImplementation((key: string) => {
      const stringMap: Record<string, string> = {
        'transactions.view_full_history_on': 'View full history on',
        'transactions.view_full_history_on_etherscan':
          'View full history on Etherscan',
        'asset_overview.disclaimer': 'This is a disclaimer text',
      };
      return stringMap[key] || key;
    });
  });

  describe('Block Explorer Button', () => {
    it('should render view more button for mainnet', () => {
      mockIsMainnetByChainId.mockReturnValue(true);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('View full history on Etherscan')).toBeTruthy();
    });

    it('should render view more button for non-RPC networks', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="polygon"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('View full history on Etherscan')).toBeTruthy();
    });

    it('should render view more button for RPC networks with block explorer', () => {
      mockIsMainnetByChainId.mockReturnValue(false);
      mockGetBlockExplorerName.mockReturnValue('Custom Explorer');

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          rpcBlockExplorer="https://custom-explorer.com"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('View full history on Custom Explorer')).toBeTruthy();
    });

    it('should not render view more button for RPC networks without block explorer', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { queryByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          rpcBlockExplorer={NO_RPC_BLOCK_EXPLORER}
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
    });

    it('should not render view more button for RPC networks with undefined block explorer', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { queryByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
    });

    it('should call onViewBlockExplorer when button is pressed', () => {
      mockIsMainnetByChainId.mockReturnValue(true);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      fireEvent.press(getByText('View full history on Etherscan'));
      expect(mockOnViewBlockExplorer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Non-EVM Chains', () => {
    it('should render view more button for non-EVM chains with block explorer', () => {
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const { getByText } = render(
        <TransactionsFooter
          chainId="solana:mainnet"
          isNonEvmChain
          rpcBlockExplorer="https://solscan.io"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('View full history on Solscan')).toBeTruthy();
    });

    it('should not render view more button for non-EVM chains without block explorer', () => {
      const { queryByText } = render(
        <TransactionsFooter
          chainId="solana:mainnet"
          isNonEvmChain
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
    });

    it('should not render view more button for non-EVM chains with NO_RPC_BLOCK_EXPLORER', () => {
      const { queryByText } = render(
        <TransactionsFooter
          chainId="solana:mainnet"
          isNonEvmChain
          rpcBlockExplorer={NO_RPC_BLOCK_EXPLORER}
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
    });

    it('should call onViewBlockExplorer for non-EVM chains', () => {
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const { getByText } = render(
        <TransactionsFooter
          chainId="solana:mainnet"
          isNonEvmChain
          rpcBlockExplorer="https://solscan.io"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      fireEvent.press(getByText('View full history on Solscan'));
      expect(mockOnViewBlockExplorer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disclaimer', () => {
    it('should render disclaimer by default', () => {
      const { getByText } = render(
        <TransactionsFooter onViewBlockExplorer={mockOnViewBlockExplorer} />,
      );

      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should render disclaimer when showDisclaimer is true', () => {
      const { getByText } = render(
        <TransactionsFooter
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer
        />,
      );

      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should not render disclaimer when showDisclaimer is false', () => {
      const { queryByText } = render(
        <TransactionsFooter
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer={false}
        />,
      );

      expect(queryByText('This is a disclaimer text')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined chainId', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { getByText } = render(
        <TransactionsFooter
          providerType="rpc"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should handle undefined providerType', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x89"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should render both button and disclaimer when both conditions are met', () => {
      mockIsMainnetByChainId.mockReturnValue(true);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer
        />,
      );

      expect(getByText('View full history on Etherscan')).toBeTruthy();
      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should render only disclaimer when no block explorer is available', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { getByText, queryByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          rpcBlockExplorer={NO_RPC_BLOCK_EXPLORER}
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });
  });

  describe('getBlockExplorerText Logic', () => {
    it('should prioritize non-EVM chain logic over mainnet logic', () => {
      mockIsMainnetByChainId.mockReturnValue(true);
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          isNonEvmChain
          rpcBlockExplorer="https://solscan.io"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(getByText('View full history on Solscan')).toBeTruthy();
      expect(mockGetBlockExplorerName).toHaveBeenCalledWith(
        'https://solscan.io',
      );
    });

    it('should call getBlockExplorerName with correct parameters', () => {
      mockIsMainnetByChainId.mockReturnValue(false);
      mockGetBlockExplorerName.mockReturnValue('Custom Explorer');

      render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          rpcBlockExplorer="https://custom-explorer.com"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(mockGetBlockExplorerName).toHaveBeenCalledWith(
        'https://custom-explorer.com',
      );
    });

    it('should call isMainnetByChainId with correct parameters', () => {
      mockIsMainnetByChainId.mockReturnValue(true);

      render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          onViewBlockExplorer={mockOnViewBlockExplorer}
        />,
      );

      expect(mockIsMainnetByChainId).toHaveBeenCalledWith('0x1');
    });
  });

  describe('Component Structure', () => {
    it('should render with correct structure when both elements are present', () => {
      mockIsMainnetByChainId.mockReturnValue(true);

      const { getByText } = render(
        <TransactionsFooter
          chainId="0x1"
          providerType="mainnet"
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer
        />,
      );

      expect(getByText('View full history on Etherscan')).toBeTruthy();
      expect(getByText('This is a disclaimer text')).toBeTruthy();
    });

    it('should render empty view when no elements are present', () => {
      mockIsMainnetByChainId.mockReturnValue(false);

      const { queryByText } = render(
        <TransactionsFooter
          chainId="0x89"
          providerType="rpc"
          rpcBlockExplorer={NO_RPC_BLOCK_EXPLORER}
          onViewBlockExplorer={mockOnViewBlockExplorer}
          showDisclaimer={false}
        />,
      );

      expect(queryByText(/View full history/)).toBeNull();
      expect(queryByText('This is a disclaimer text')).toBeNull();
    });
  });
});
