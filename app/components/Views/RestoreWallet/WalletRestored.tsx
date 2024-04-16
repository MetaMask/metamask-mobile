/* eslint-disable import/no-commonjs */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  ScrollView,
  Text as RNText,
  Linking,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StyledButton from '../../UI/StyledButton';
import Logger from '../../../util/Logger';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Authentication } from '../../../core';
import { useAppThemeFromContext } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { StackNavigationProp } from '@react-navigation/stack';
import selectSelectedInternalAccount from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { toChecksumAddress } from 'ethereumjs-util';

export const createWalletRestoredNavDetails = createNavigationDetails(
  Routes.VAULT_RECOVERY.WALLET_RESTORED,
);

const WalletRestored = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { colors } = useAppThemeFromContext();
  const { trackEvent } = useMetrics();
  const styles = createStyles(colors);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const checksummedSelectedAddress = toChecksumAddress(
    selectedInternalAccount.address,
  );

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
      deviceMetaData,
    );
  }, [deviceMetaData, trackEvent]);

  const finishWalletRestore = useCallback(async (): Promise<void> => {
    try {
      // Log to provide insights into bug research.
      // Check https://github.com/MetaMask/mobile-planning/issues/1507
      if (typeof checksummedSelectedAddress !== 'string') {
        const walletRestoreError = new Error('Wallet restore error');
        Logger.error(walletRestoreError, 'selectedAddress is not a string');
      }
      await Authentication.appTriggeredAuth({
        selectedAddress: checksummedSelectedAddress,
      });
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
    } catch (e) {
      // we were not able to log in automatically so we will go back to login
      navigation.replace(Routes.ONBOARDING.LOGIN);
    }
  }, [navigation, checksummedSelectedAddress]);

  const onPressBackupSRP = useCallback(async (): Promise<void> => {
    Linking.openURL(SRP_GUIDE_URL);
  }, []);

  const handleOnNext = useCallback(async (): Promise<void> => {
    setLoading(true);
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_CONTINUE_BUTTON_PRESSED,
      deviceMetaData,
    );
    await finishWalletRestore();
  }, [deviceMetaData, finishWalletRestore, trackEvent]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <RNText style={styles.emoji}>🎉</RNText>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('wallet_restored.wallet_restored_title')}
        </Text>
        <Text style={styles.description}>
          <Text variant={TextVariant.BodyMD}>
            {`${strings(
              'wallet_restored.wallet_restored_description_part_one',
            )}\n\n`}
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.description}>
            {strings('wallet_restored.wallet_restored_description_part_two')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.blueText}
            onPress={onPressBackupSRP}
          >
            {` ${strings('wallet_restored.wallet_restored_description_link')} `}
          </Text>
          <Text variant={TextVariant.BodyMD}>
            {strings('wallet_restored.wallet_restored_description_part_three')}
          </Text>
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <StyledButton
          type="confirm"
          containerStyle={styles.actionButton}
          onPress={handleOnNext}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary.inverse} />
          ) : (
            strings('wallet_restored.wallet_restored_action')
          )}
        </StyledButton>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(WalletRestored);
