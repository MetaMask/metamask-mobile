/* eslint-disable import/no-commonjs */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StyledButton from '../../UI/StyledButton';
import EngineService from '../../../core/EngineService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppThemeFromContext } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import type {
  StackScreenProps,
  StackNavigationProp,
} from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');

type RestoreWalletProps = StackScreenProps<RootParamList, 'RestoreWallet'>;

const RestoreWallet = ({ route }: RestoreWalletProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useAppThemeFromContext();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState<boolean>(false);

  const { replace } = useNavigation<StackNavigationProp<RootParamList>>();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);
  const { previousScreen } = route.params;

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
      )
        .addProperties({ ...deviceMetaData, previousScreen })
        .build(),
    );
  }, [deviceMetaData, previousScreen, trackEvent, createEventBuilder]);

  const handleOnNext = useCallback(async (): Promise<void> => {
    setLoading(true);

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
      )
        .addProperties({ ...deviceMetaData })
        .build(),
    );
    const restoreResult = await EngineService.initializeVaultFromBackup();
    if (restoreResult.success) {
      replace('WalletRestored');
      setLoading(false);
    } else {
      replace('WalletResetNeeded');
      setLoading(false);
    }
  }, [deviceMetaData, replace, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.images}>
          <Image source={onboardingDeviceImage} />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('restore_wallet.restore_needed_title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('restore_wallet.restore_needed_description')}
        </Text>
      </View>
      <View style={styles.actionButtonWrapper}>
        <StyledButton
          type="confirm"
          containerStyle={styles.actionButton}
          onPress={handleOnNext}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary.inverse} />
          ) : (
            strings('restore_wallet.restore_needed_action')
          )}
        </StyledButton>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(RestoreWallet);
