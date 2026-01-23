import React from 'react';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import {
  getBlockExplorerName,
  isMainnetByChainId,
} from '../../../util/networks';

const styles = StyleSheet.create({
  viewMoreWrapper: {
    padding: 16,
  },
  disclaimerWrapper: {
    padding: 16,
  },
});

interface TransactionsFooterProps {
  /**
   * Chain ID for block explorer links
   */
  chainId?: string;
  /**
   * Provider type (mainnet, rpc, etc.)
   */
  providerType?: string;
  /**
   * RPC block explorer URL
   */
  rpcBlockExplorer?: string;
  /**
   * Whether this is a non-EVM chain
   */
  isNonEvmChain?: boolean;
  /**
   * Handler for view block explorer button press
   */
  onViewBlockExplorer: () => void;
  /**
   * Whether to show disclaimer footer
   */
  showDisclaimer?: boolean;
}

const TransactionsFooter = ({
  chainId,
  providerType,
  rpcBlockExplorer,
  isNonEvmChain = false,
  onViewBlockExplorer,
  showDisclaimer = true,
}: TransactionsFooterProps) => {
  const getBlockExplorerText = (): string | null => {
    if (isNonEvmChain) {
      if (rpcBlockExplorer && rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER) {
        return `${strings(
          'transactions.view_full_history_on',
        )} ${getBlockExplorerName(rpcBlockExplorer)}`;
      }
      return null;
    }

    if (isMainnetByChainId(chainId) || (providerType && providerType !== RPC)) {
      return strings('transactions.view_full_history_on_etherscan');
    }

    if (rpcBlockExplorer && rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER) {
      return `${strings(
        'transactions.view_full_history_on',
      )} ${getBlockExplorerName(rpcBlockExplorer)}`;
    }

    return null;
  };

  const blockExplorerText = getBlockExplorerText();

  return (
    <View>
      {blockExplorerText && rpcBlockExplorer && (
        <View style={styles.viewMoreWrapper}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={onViewBlockExplorer}
            isFullWidth
          >
            {blockExplorerText}
          </Button>
        </View>
      )}
      {showDisclaimer && (
        <View style={styles.disclaimerWrapper}>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('asset_overview.disclaimer')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default TransactionsFooter;
