import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
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
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Theme } from '../../../../../util/theme/models';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';
import { Transaction } from '@metamask/keyring-api';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingLeft: 16,
      paddingRight: 16,
    },
    text: {
      color: params.theme.colors.primary.default,
    },
  });

interface BlockExplorersModalRouteParams {
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}

const BlockExplorersModal = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<{ params: BlockExplorersModalRouteParams }, 'params'>>();
  const { styles } = useStyles(styleSheet, {});

  const evmTxMeta = route.params.evmTxMeta;
  const multiChainTx = route.params.multiChainTx;

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    evmTxMeta,
    multiChainTx,
  });

  // Get source chain explorer data
  const srcExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.srcChainId,
    txHash: bridgeTxHistoryItem?.status.srcChain?.txHash || evmTxMeta?.hash,
  });

  // Get destination chain explorer data
  const bridgeDestExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.destChainId,
    txHash: bridgeTxHistoryItem?.status.destChain?.txHash,
  });

  const handleBlockExplorerPress = useCallback(
    (url: string | undefined, text: string) => {
      if (!url) {
        return;
      }
      trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
        location: 'bridge_transaction_details',
        text,
        url,
      });

      // Dismiss the transparent modal stack before opening the in-app webview.
      // Navigating while the modal is still presented leaves a touch-blocking
      // overlay on top and freezes the app.
      sheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
          },
        });
      });
    },
    [trackEvent, createEventBuilder, navigation],
  );

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader>
        {strings('bridge_transaction_details.view_on_block_explorer')}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={20}
      >
        <Text variant={TextVariant.BodyMD}>
          {strings('bridge_transaction_details.block_explorer_description', {
            chainName: srcExplorerData?.chainName,
          })}
        </Text>
        {srcExplorerData?.explorerTxUrl && (
          <Button
            variant={ButtonVariant.Secondary}
            isFullWidth
            onPress={() =>
              handleBlockExplorerPress(
                srcExplorerData.explorerTxUrl,
                srcExplorerData.explorerName ?? srcExplorerData.chainName ?? '',
              )
            }
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={8}
            >
              <Badge
                variant={BadgeVariant.Network}
                name={srcExplorerData.chainName}
                imageSource={srcExplorerData.networkImageSource}
              />
              <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                {srcExplorerData.explorerName}
              </Text>
            </Box>
          </Button>
        )}

        {bridgeDestExplorerData?.explorerTxUrl && (
          <Button
            variant={ButtonVariant.Secondary}
            isFullWidth
            onPress={() =>
              handleBlockExplorerPress(
                bridgeDestExplorerData.explorerTxUrl,
                bridgeDestExplorerData.explorerName ??
                  bridgeDestExplorerData.chainName ??
                  '',
              )
            }
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={8}
            >
              <Badge
                variant={BadgeVariant.Network}
                name={bridgeDestExplorerData.chainName}
                imageSource={bridgeDestExplorerData.networkImageSource}
              />
              <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                {bridgeDestExplorerData.explorerName}
              </Text>
            </Box>
          </Button>
        )}
      </Box>
    </BottomSheet>
  );
};

export default BlockExplorersModal;
