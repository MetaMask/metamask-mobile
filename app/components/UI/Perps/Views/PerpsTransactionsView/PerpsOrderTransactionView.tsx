import React from 'react';
import { View, ScrollView, Linking } from 'react-native';
import {
  NavigationProp,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import type { Theme } from '../../../../../util/theme/models';
import ScreenView from '../../../../Base/ScreenView';
import { PerpsNavigationParamList } from '../../types/navigation';
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import RemoteImage from '../../../../Base/RemoteImage';
import { PerpsTransaction } from '../PerpsTransactionsView/PerpsTransactionsView';
import { formatPerpsFiat } from '../../utils/formatUtils';
import { getPerpsTransactionsDetailsNavbar } from '../../../Navbar';
import { usePerpsNetwork, usePerpsOrderFees } from '../../hooks';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { getHyperliquidExplorerUrl } from '../../utils/blockchainUtils';
import { BigNumber } from 'bignumber.js';

// Interface now imported from PerpsTransactionsView

type PerpsOrderTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsOrderTransaction'
>;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    assetContainer: {
      alignItems: 'center' as const,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    assetIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 36,
      marginBottom: 16,
      overflow: 'hidden' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    assetIcon: {
      width: 44,
      height: 44,
      borderRadius: 36,
    },
    assetAmount: {
      fontWeight: '700' as const,
      color: colors.text.default,
    },
    detailsContainer: {
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text.default,
      fontWeight: '400' as const,
    },
    sectionSeparator: {
      height: 16,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    blockExplorerButton: {
      marginTop: 16,
      marginBottom: 16,
    },
  };
};

// Asset display component
const AssetDisplay = ({ transaction }: { transaction: PerpsTransaction }) => {
  const { styles } = useStyles(styleSheet, {});
  const { assetUrl } = usePerpsAssetMetadata(transaction.asset);

  return (
    <View style={styles.assetContainer}>
      <View style={styles.assetIconContainer}>
        {assetUrl ? (
          <RemoteImage
            source={{ uri: assetUrl }}
            style={styles.assetIcon}
            resizeMode="cover"
          />
        ) : (
          <Avatar
            variant={AvatarVariant.Network}
            name={transaction.asset}
            size={AvatarSize.Lg}
          />
        )}
      </View>
      <Text variant={TextVariant.HeadingLG} style={styles.assetAmount}>
        {transaction.subtitle}
      </Text>
    </View>
  );
};

const PerpsOrderTransactionView: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsOrderTransactionRouteProp>();
  const perpsNetwork = usePerpsNetwork();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  // Get transaction from route params
  const transaction = route.params?.transaction as PerpsTransaction;

  const {
    totalFee,
    protocolFee,
    protocolFeeRate,
    metamaskFee,
    metamaskFeeRate,
    isLoadingMetamaskFee,
    error,
  } = usePerpsOrderFees({
    orderType: transaction.order?.type ?? 'market',
    amount: transaction.order?.size ?? '0',
  });

  // Set navigation title
  navigation.setOptions(
    getPerpsTransactionsDetailsNavbar(navigation, transaction.title),
  );

  if (!transaction) {
    return (
      <ScreenView>
        <View style={styles.content}>
          <Text>Transaction not found</Text>
        </View>
      </ScreenView>
    );
  }

  const formatDate = (timestamp: number): string =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(timestamp));

  const handleViewOnBlockExplorer = () => {
    if (!selectedInternalAccount) {
      return;
    }
    Linking.openURL(
      getHyperliquidExplorerUrl(perpsNetwork, selectedInternalAccount.address),
    );
  };

  // Main detail rows based on design
  const mainDetailRows = [
    { label: 'Date', value: formatDate(transaction.timestamp) },
    // Add order-specific fields when available from transaction data
    {
      label: 'Size',
      value: formatPerpsFiat(transaction.order?.size ?? 0),
    },
    {
      label: 'Limit price',
      value: formatPerpsFiat(transaction.order?.limitPrice ?? 0),
    },
    { label: 'Filled', value: transaction.order?.filled },
  ];

  const isFilled = transaction.order?.text === 'Filled';
  // Fee breakdown

  const feeRows = [
    {
      label: 'MetaMask fee',
      value: `${
        isFilled
          ? `${
              BigNumber(metamaskFee).isLessThan(0.01)
                ? `$${metamaskFee}`
                : formatPerpsFiat(metamaskFee)
            }`
          : '$0'
      }`,
    },
    {
      label: 'Hyperliquid fee',
      value: `${
        isFilled
          ? `${
              BigNumber(protocolFee).isLessThan(0.01)
                ? `$${protocolFee}`
                : formatPerpsFiat(protocolFee)
            }`
          : '$0'
      }`,
    },
    {
      label: 'Total fee',
      value: `${
        isFilled
          ? `${
              BigNumber(totalFee).isLessThan(0.01)
                ? `$${totalFee}`
                : formatPerpsFiat(totalFee)
            }`
          : '$0'
      }`,
    },
  ];

  return (
    <ScreenView>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Asset display with centered icon and amount */}
          <AssetDisplay transaction={transaction} />

          {/* Transaction details */}
          <View style={styles.detailsContainer}>
            {mainDetailRows.map((detail, index) => (
              <View
                key={index}
                style={[
                  styles.detailRow,
                  index === mainDetailRows.length - 1 && styles.detailRowLast,
                ]}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {detail.label}
                </Text>
                <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                  {detail.value}
                </Text>
              </View>
            ))}

            {/* Separator between sections */}
            <View style={styles.sectionSeparator} />

            {/* Fee breakdown */}
            {feeRows.map((detail, index) => (
              <View
                key={`fee-${index}`}
                style={[
                  styles.detailRow,
                  index === feeRows.length - 1 && styles.detailRowLast,
                ]}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {detail.label}
                </Text>
                <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Block explorer button */}
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="View on block explorer"
            onPress={handleViewOnBlockExplorer}
            style={styles.blockExplorerButton}
          />
        </View>
      </ScrollView>
    </ScreenView>
  );
};

export default PerpsOrderTransactionView;
