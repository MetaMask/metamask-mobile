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
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Authentication } from '../../../core';
import { useAppThemeFromContext } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { trackEventV2 as trackEvent } from '../../../util/analyticsV2';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { StackNavigationProp } from '@react-navigation/stack';
import { selectSelectedAddress } from '../../../selectors/preferencesController';

export const createWalletRestoredNavDetails = createNavigationDetails(
  Routes.VAULT_RECOVERY.WALLET_RESTORED,
);

const WalletRestored = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { colors } = useAppThemeFromContext();
  const styles = createStyles(colors);
  const navigation = useNavigation<StackNavigationProp<any>>();
  const selectedAddress = useSelector(selectSelectedAddress);

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
      deviceMetaData,
    );
  }, [deviceMetaData]);

  const finishWalletRestore = useCallback(async (): Promise<void> => {
    try {
      await Authentication.appTriggeredAuth(selectedAddress);
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
    } catch (e) {
      // we were not able to log in automatically so we will go back to login
      navigation.replace(Routes.ONBOARDING.LOGIN);
    }
  }, [navigation, selectedAddress]);

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
  }, [deviceMetaData, finishWalletRestore]);

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
