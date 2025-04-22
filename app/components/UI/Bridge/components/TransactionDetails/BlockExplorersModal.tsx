import React from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
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
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Theme } from '../../../../../util/theme/models';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';
import { Transaction } from '@metamask/keyring-api';

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

interface BlockExplorersModalProps {
  route: {
    params: {
      evmTxMeta?: TransactionMeta;
      multiChainTx?: Transaction;
    };
  };
}

const BlockExplorersModal = (props: BlockExplorersModalProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    evmTxMeta: props.route.params.evmTxMeta,
    multiChainTx: props.route.params.multiChainTx,
  });

  // Get source chain explorer data
  const srcExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.srcChainId,
    txHash: bridgeTxHistoryItem?.status.srcChain?.txHash,
  });

  // Get destination chain explorer data
  const destExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.destChainId,
    txHash: bridgeTxHistoryItem?.status.destChain?.txHash,
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
        gap={20}
      >
        <Text variant={TextVariant.BodyMD}>
          {strings('bridge_transaction_details.block_explorer_description', {
            chainName: srcExplorerData?.chainName,
          })}
        </Text>
        {srcExplorerData && (
          <Button
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            label={
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
            }
            onPress={() => {
              navigation.navigate(Routes.BROWSER.HOME, {
                screen: Routes.BROWSER.VIEW,
                params: {
                  newTabUrl: srcExplorerData.explorerTxUrl,
                  timestamp: Date.now(),
                },
              });
            }}
          />
        )}

        {destExplorerData && (
          <Button
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            label={
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={8}
              >
                <Badge
                  variant={BadgeVariant.Network}
                  name={destExplorerData.chainName}
                  imageSource={destExplorerData.networkImageSource}
                />
                <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                  {destExplorerData.explorerName}
                </Text>
              </Box>
            }
            onPress={() => {
              navigation.navigate(Routes.BROWSER.HOME, {
                screen: Routes.BROWSER.VIEW,
                params: {
                  newTabUrl: destExplorerData.explorerTxUrl,
                  timestamp: Date.now(),
                },
              });
            }}
          />
        )}
      </Box>
    </BottomSheet>
  );
};

export default BlockExplorersModal;
