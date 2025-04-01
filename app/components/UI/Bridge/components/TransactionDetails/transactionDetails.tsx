import { useNavigation } from '@react-navigation/native';
import Text, { TextColor, TextVariant } from '../../../../../component-library/components/Texts/Text';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../../../Box/box.types';
import { useEffect } from 'react';
import { getBridgeTransactionDetailsNavbar } from '../../../Navbar';
import { useBridgeTxHistoryData } from '../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import { TransactionMeta } from '@metamask/transaction-controller';
import { decimalToPrefixedHex } from '../../../../../util/conversions';
import { useSelector } from 'react-redux';
import { getHexGasTotal } from '../../../../../util/confirm-tx';
import { Hex } from '@metamask/utils';
import { selectEvmTokens } from '../../../../../selectors/multichain/evm';
import { TokenI } from '../../../Tokens/types';
import Icon, { IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import TransactionAsset from './transactionAsset';
import { StatusTypes } from '@metamask/bridge-status-controller';
import { calcTokenAmount } from '../../../../../util/transactions';
import { StyleSheet } from 'react-native';
import { calcHexGasTotal } from '../../utils/transactionGas';

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
      paddingLeft: 16,
      paddingVertical: 8,
    },
    transactionContainer: {
      paddingLeft: 8,
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
  if (!bridgeTxHistoryItem) {
    // TODO: display error page
    return null;
  }
  const { quote, status, startTime } = bridgeTxHistoryItem;
  const tokens = useSelector(selectEvmTokens);

  useEffect(() => {
    navigation.setOptions(getBridgeTransactionDetailsNavbar(navigation));
  }, [navigation]);

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
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>Status</Text>
          <Box flexDirection={FlexDirection.Row} gap={4}>
            <Text variant={TextVariant.BodyMDMedium} color={StatusToColorMap[status.status]} style={{ textTransform: 'capitalize' }}>{status.status}</Text>
            {status.status === StatusTypes.PENDING && estimatedCompletionString && (
              <Text variant={TextVariant.BodyMDMedium}>Est. completion {estimatedCompletionString}</Text>
            )}
          </Box>
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>Date</Text>
          <Text>{submissionDateString}</Text>
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>Total gas fee</Text>
          <Text>{totalGasFee} ETH</Text>
        </Box>
      </Box>
    </ScreenView>
  );
};
