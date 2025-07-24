import React, { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { USDC_SYMBOL } from '../../constants/hyperLiquidConfig';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { usePerpsTrading } from '../../hooks';
import createStyles from './PerpsWithdrawPreview.styles';

type PerpsWithdrawPreviewRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsWithdrawPreview'
>;

const PerpsWithdrawPreview: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsWithdrawPreviewRouteProp>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get route params
  const {
    amount,
    networkFee,
    metamaskFee,
    totalFees,
    receivingAmount,
    estimatedTime,
  } = route.params;

  // Hooks
  const { withdraw } = usePerpsTrading();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    if (!selectedAddress) {
      setError('No wallet address found');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      DevLogger.log('PerpsWithdrawPreview: Initiating withdrawal', {
        amount,
        destination: selectedAddress,
      });

      const result = await withdraw({
        amount,
        // Destination defaults to current account in HyperLiquidProvider
      });

      if (result.success && result.txHash) {
        navigation.navigate(Routes.PERPS.WITHDRAW_PROCESSING, {
          amount: receivingAmount,
          transactionHash: result.txHash,
        });
      } else {
        setError(result.error || strings('perps.errors.withdrawalFailed'));
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : strings('perps.errors.unknownError');
      setError(errorMessage);
      DevLogger.log('PerpsWithdrawPreview: Withdrawal error', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [amount, receivingAmount, selectedAddress, withdraw, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={handleBack}
          iconColor={IconColor.Default}
          style={styles.backButton}
          testID="preview-back-button"
        />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings('perps.withdrawal.confirm')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Amount Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingSM} style={styles.sectionTitle}>
            {strings('perps.withdrawal.title')}
          </Text>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('app_settings.general.amount')}
            </Text>
            <Text variant={TextVariant.BodyMDBold}>
              {amount} {USDC_SYMBOL}
            </Text>
          </View>
        </View>

        {/* Fees Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.HeadingSM} style={styles.sectionTitle}>
            {strings('send.fee')}
          </Text>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.network_fee')}
            </Text>
            <Text variant={TextVariant.BodyMD}>{networkFee}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.metamask_fee')}
            </Text>
            <Text variant={TextVariant.BodyMD}>{metamaskFee}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant={TextVariant.BodyMDBold}>
              {strings('perps.withdrawal.total_fees')}
            </Text>
            <Text variant={TextVariant.BodyMDBold}>{totalFees}</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.receiving_amount')}
            </Text>
            <Text variant={TextVariant.HeadingMD} color={TextColor.Success}>
              {receivingAmount}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.estimated_time')}
            </Text>
            <Text variant={TextVariant.BodyMD}>~{estimatedTime}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Warning}
            style={styles.noticeText}
          >
            {strings('perps.withdrawal.processing_description')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        {error && (
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {error}
          </Text>
        )}

        <Button
          variant={ButtonVariants.Primary}
          label={
            isSubmitting
              ? strings('perps.deposit.confirming')
              : strings('perps.withdrawal.confirm')
          }
          onPress={handleConfirm}
          style={styles.confirmButton}
          disabled={isSubmitting}
          testID="confirm-withdrawal-button"
        />
      </View>
    </View>
  );
};

export default PerpsWithdrawPreview;
