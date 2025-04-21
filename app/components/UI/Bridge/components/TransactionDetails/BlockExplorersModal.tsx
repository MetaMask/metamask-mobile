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
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { Theme } from '../../../../../util/theme/models';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';

const styleSheet = (params: { theme: Theme }) =>
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
      color: params.theme.colors.primary.default,
    },
  });

interface BlockExplorersModalProps {
  route: {
    params: {
      tx: TransactionMeta;
    };
  };
}

const BlockExplorersModal = (props: BlockExplorersModalProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    txMeta: props.route.params.tx,
  });

  // Get source chain explorer data
  const {
    explorerTxUrl: srcExplorerTxUrl,
    explorerName: srcExplorerName,
    networkImageSource: srcNetworkImageSource,
    chainName: srcChainName,
  } = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem.quote.srcChainId,
    txHash: props.route.params.tx.hash,
  });

  // Get destination chain explorer data
  const {
    explorerTxUrl: destExplorerTxUrl,
    explorerName: destExplorerName,
    networkImageSource: destNetworkImageSource,
    chainName: destChainName,
  } = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem.quote.destChainId,
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
      >
        {srcExplorerTxUrl && (
          <Button
            variant={ButtonVariants.Secondary}
            label={
              <>
                <Badge
                  variant={BadgeVariant.Network}
                  name={srcChainName}
                  imageSource={srcNetworkImageSource}
                  style={styles.badge}
                />
                <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                  {srcExplorerName}
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
                  name={destChainName}
                  imageSource={destNetworkImageSource}
                  style={styles.badge}
                />
                <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
                  {destExplorerName}
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
