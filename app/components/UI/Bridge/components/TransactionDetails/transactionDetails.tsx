import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text, { TextColor, TextVariant } from '../../../../../component-library/components/Texts/Text';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../../../Box/box.types';
import { getBridgeTransactionDetailsNavbar } from '../../../Navbar';
import { useBridgeTxHistoryData } from '../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { TransactionMeta } from '@metamask/transaction-controller';
import { decimalToPrefixedHex } from '../../../../../util/conversions';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectEvmTokens } from '../../../../../selectors/multichain/evm';
import { TokenI } from '../../../Tokens/types';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import TransactionAsset from './TransactionAsset';
import { StatusTypes } from '@metamask/bridge-status-controller';
import { calcTokenAmount } from '../../../../../util/transactions';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { calcHexGasTotal } from '../../utils/transactionGas';
import { strings } from '../../../../../../locales/i18n';
import BridgeStepList from './BridgeStepList';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import Button, { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';

const createStyles = () =>
  StyleSheet.create({
    detailRow: {
      flexDirection: FlexDirection.Row,
      justifyContent: JustifyContent.spaceBetween,
      alignItems: AlignItems.center,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    arrowContainer: {
      paddingLeft: 11,
      paddingTop: 1,
      paddingBottom: 10,
    },
    transactionContainer: {
      paddingLeft: 8,
    },
    transactionAssetsContainer: {
      paddingVertical: 16,
    },
    blockExplorerButton: {
      width: '90%',
      alignSelf: 'center',
      marginTop: 12,
    },
    textTransform: {
      textTransform: 'capitalize',
    },
  });

interface BridgeTransactionDetailsProps {
  route: {
    params: {
      tx: TransactionMeta;
    };
  };
}

const StatusToColorMap: Record<StatusTypes, TextColor> = {
  [StatusTypes.PENDING]: TextColor.Warning,
  [StatusTypes.COMPLETE]: TextColor.Success,
  [StatusTypes.FAILED]: TextColor.Error,
  [StatusTypes.UNKNOWN]: TextColor.Error,
};

export const BridgeTransactionDetails = (props: BridgeTransactionDetailsProps) => {
  const styles = createStyles();
  const navigation = useNavigation();
  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({txMeta: props.route.params.tx});
  const [isStepListExpanded, setIsStepListExpanded] = useState(false);
  const tokens = useSelector(selectEvmTokens);
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  useEffect(() => {
    navigation.setOptions(getBridgeTransactionDetailsNavbar(navigation));
  }, [navigation]);

  if (!bridgeTxHistoryItem) {
    // TODO: display error page
    return null;
  }
  const { quote, status, startTime } = bridgeTxHistoryItem;

  

  const sourceToken = tokens.find((token: TokenI) => token.address === quote.srcAsset.address);
  const sourceTokenAmount = calcTokenAmount(quote.srcTokenAmount, quote.srcAsset.decimals).toFixed(5);
  const sourceChainId = decimalToPrefixedHex(quote.srcChainId);

  const destinationToken = tokens.find((token: TokenI) => token.address === quote.destAsset.address);
  const destinationTokenAmount = calcTokenAmount(quote.destTokenAmount, quote.destAsset.decimals).toFixed(5);
  const destinationChainId = decimalToPrefixedHex(quote.destChainId);

  const submissionDate = startTime ? new Date(startTime) : null;
  const submissionDateString = submissionDate ? submissionDate.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const estimatedCompletionDate = submissionDate
    ? new Date(submissionDate.getTime() + (bridgeTxHistoryItem.estimatedProcessingTimeInSeconds * 1000))
    : null;
  const estimatedCompletionString = estimatedCompletionDate
    ? estimatedCompletionDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  const totalGasFee = calcTokenAmount(calcHexGasTotal(props.route.params.tx), 18).toFixed(5);

  return (
    <ScreenView>
      <Box style={styles.transactionContainer}>
        <Box style={styles.transactionAssetsContainer}>
          <TransactionAsset
            token={sourceToken as TokenI}
            tokenAmount={sourceTokenAmount}
            chainId={sourceChainId as Hex}
          />
          <Box style={styles.arrowContainer}>
            <Icon name={IconName.Arrow2Down} size={IconSize.Sm} />
          </Box>
          <TransactionAsset
            token={destinationToken as TokenI}
            tokenAmount={destinationTokenAmount}
            chainId={destinationChainId as Hex}
          />
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>{strings('bridge_transaction_details.status')}</Text>
          <Box flexDirection={FlexDirection.Row} gap={4} alignItems={AlignItems.center}>
            <Text variant={TextVariant.BodyMDMedium} color={StatusToColorMap[status.status]} style={styles.textTransform}>{status.status}</Text>
            {status.status === StatusTypes.PENDING && estimatedCompletionString && (
              <>
                <Text variant={TextVariant.BodyMDMedium}>{strings('bridge_transaction_details.estimated_completion')} {estimatedCompletionString}</Text>
                <TouchableOpacity onPress={() => setIsStepListExpanded(!isStepListExpanded)}>
                  <Icon
                    name={isStepListExpanded ? IconName.ArrowUp : IconName.ArrowDown}
                    color={IconColor.Muted}
                    size={IconSize.Sm}
                  />
                </TouchableOpacity>
              </>
            )}
          </Box>
        </Box>
        {status.status !== StatusTypes.COMPLETE && isStepListExpanded && (
          <Box style={styles.detailRow}>
            <BridgeStepList
              bridgeHistoryItem={bridgeTxHistoryItem}
              srcChainTxMeta={props.route.params.tx}
              networkConfigurationsByChainId={networkConfigurationsByChainId}
            />
          </Box>
        )}
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>{strings('bridge_transaction_details.date')}</Text>
          <Text>{submissionDateString}</Text>
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>{strings('bridge_transaction_details.total_gas_fee')}</Text>
          <Text>{totalGasFee} ETH</Text>
        </Box>
      </Box>
      <Box>
        <Button
          style={styles.blockExplorerButton}
          variant={ButtonVariants.Secondary}
          label={strings('bridge_transaction_details.view_on_block_explorer')}
          onPress={() => {
            navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
              screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
              params: {
                tx: props.route.params.tx,
              },
            });
          }}
        />
      </Box>
    </ScreenView>
  );
};
