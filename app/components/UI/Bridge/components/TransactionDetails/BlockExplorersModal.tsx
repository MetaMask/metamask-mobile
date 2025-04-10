import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Box } from '../../../Box/Box';
import {
  AlignItems,
  JustifyContent,
  FlexDirection,
} from '../../../Box/box.types';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useBridgeTxHistoryData } from '../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { decimalToPrefixedHex } from '../../../../../util/conversions';
import {
  createProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import useBlockExplorer from '../../../Swaps/utils/useBlockExplorer';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkConfiguration } from '@metamask/network-controller';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: 100,
    },
    button: {
      width: '90%',
      alignSelf: 'center',
    },
    firstButton: {
      marginBottom: 10,
    },
    badge: {
      marginRight: 10,
    },
    text: {
      color: theme.colors.primary.default,
    },
  });

const getProviderConfigForNetwork = (networkConfig: NetworkConfiguration) => {
  const rpcEndpoint =
    networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex];
  const providerConfig = createProviderConfig(networkConfig, rpcEndpoint);

  return providerConfig;
};

interface BlockExplorersModalProps {
  route: {
    params: {
      tx: TransactionMeta;
    };
  };
}

const BlockExplorersModal = (props: BlockExplorersModalProps) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    txMeta: props.route.params.tx,
  });
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  // Get source chain explorer data
  const srcChainIdHex = decimalToPrefixedHex(
    bridgeTxHistoryItem.quote.srcChainId,
  );
  const srcNetworkConfig = networkConfigurations[srcChainIdHex as Hex];
  const srcProviderConfig = useMemo(
    () => getProviderConfigForNetwork(srcNetworkConfig),
    [srcNetworkConfig],
  );
  const srcExplorer = useBlockExplorer(
    networkConfigurations,
    srcProviderConfig,
  );
  const srcExplorerTxUrl = props.route.params.tx.hash
    ? srcExplorer.tx(props.route.params.tx.hash)
    : undefined;
  //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
  const srcNetworkImageSource = getNetworkImageSource({
    chainId: srcChainIdHex,
  });

  // Get destination chain explorer data
  const destChainIdHex = decimalToPrefixedHex(
    bridgeTxHistoryItem.quote.destChainId,
  );
  const destNetworkConfig = networkConfigurations[destChainIdHex as Hex];
  const destProviderConfig = useMemo(
    () => getProviderConfigForNetwork(destNetworkConfig),
    [destNetworkConfig],
  );
  const destExplorer = useBlockExplorer(
    networkConfigurations,
    destProviderConfig,
  );
  const destExplorerTxUrl = bridgeTxHistoryItem?.status.destChain?.txHash
    ? destExplorer.tx(bridgeTxHistoryItem.status.destChain.txHash)
    : undefined;
  //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
  const destNetworkImageSource = getNetworkImageSource({
    chainId: destChainIdHex,
  });

  return (
    <BottomSheet>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge_transaction_details.view_on_block_explorer')}
        </Text>
      </BottomSheetHeader>
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
      >
        {srcExplorerTxUrl && (
          <Button
            variant={ButtonVariants.Secondary}
            label={
              <>
                <Badge
                  variant={BadgeVariant.Network}
                  name={srcNetworkConfig.name}
                  imageSource={srcNetworkImageSource}
                  style={styles.badge}
                />
                <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                  {srcExplorer.name}
                </Text>
              </>
            }
            onPress={() => {
              navigation.navigate(Routes.BROWSER.HOME, {
                screen: Routes.BROWSER.VIEW,
                params: {
                  newTabUrl: srcExplorerTxUrl,
                  timestamp: Date.now(),
                },
              });
            }}
            style={{ ...styles.button, ...styles.firstButton }}
          />
        )}

        {destExplorerTxUrl && (
          <Button
            variant={ButtonVariants.Secondary}
            label={
              <>
                <Badge
                  variant={BadgeVariant.Network}
                  name={destNetworkConfig.name}
                  imageSource={destNetworkImageSource}
                  style={styles.badge}
                />
                <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                  {destExplorer.name}
                </Text>
              </>
            }
            onPress={() => {
              navigation.navigate(Routes.BROWSER.HOME, {
                screen: Routes.BROWSER.VIEW,
                params: {
                  newTabUrl: destExplorerTxUrl,
                  timestamp: Date.now(),
                },
              });
            }}
            style={styles.button}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

export default BlockExplorersModal;
