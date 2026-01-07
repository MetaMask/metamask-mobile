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
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { MIGRATION_ERROR_HAPPENED } from '../../../constants/storage';
import { createStyles } from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StyledButton from '../../UI/StyledButton';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppThemeFromContext } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Logger from '../../../util/Logger';

export const createWalletRestoredNavDetails = createNavigationDetails(
  Routes.VAULT_RECOVERY.WALLET_RESTORED,
);

const WalletRestored = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { colors } = useAppThemeFromContext();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_SCREEN_VIEWED,
      )
        .addProperties({ ...deviceMetaData })
        .build(),
    );
  }, [deviceMetaData, trackEvent, createEventBuilder]);

  const finishWalletRestore = useCallback(async (): Promise<void> => {
    try {
      await FilesystemStorage.removeItem(MIGRATION_ERROR_HAPPENED);
    } catch (error) {
      Logger.error(error as Error, 'Failed to clear migration error flag');
    }

    navigation.replace(Routes.ONBOARDING.LOGIN);
  }, [navigation]);

  const onPressBackupSRP = useCallback(async (): Promise<void> => {
    Linking.openURL(SRP_GUIDE_URL);
  }, []);

  const handleOnNext = useCallback((): void => {
    setLoading(true);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_WALLET_SUCCESSFULLY_RESTORED_CONTINUE_BUTTON_PRESSED,
      )
        .addProperties({ ...deviceMetaData })
        .build(),
    );
    finishWalletRestore();
  }, [deviceMetaData, finishWalletRestore, trackEvent, createEventBuilder]);

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
