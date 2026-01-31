/* eslint-disable import/no-commonjs */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StyledButton from '../../UI/StyledButton';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import EngineService from '../../../core/EngineService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppThemeFromContext } from '../../../util/theme';
import { createWalletResetNeededNavDetails } from './WalletResetNeeded';
import { createWalletRestoredNavDetails } from './WalletRestored';
import { MetaMetricsEvents } from '../../../core/Analytics';

import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { filterUndefinedValues } from '../../../util/analytics/filterUndefinedValues';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMetrics } from '../../../components/hooks/useMetrics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');
interface RestoreWalletParams {
  previousScreen: string;
}

export const createRestoreWalletNavDetails =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

// Needed for passing the proper params from outside this stack navigator
// This occurs from the Login screen
export const createRestoreWalletNavDetailsNested =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

const RestoreWallet = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = useAppThemeFromContext();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState<boolean>(false);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { replace } = useNavigation<StackNavigationProp<any>>();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);
  const { previousScreen } = useParams<RestoreWalletParams>();

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
      )
        .addProperties(
          filterUndefinedValues({ ...deviceMetaData, previousScreen }),
        )
        .build(),
    );
  }, [deviceMetaData, previousScreen, trackEvent, createEventBuilder]);

  const handleOnNext = useCallback(async (): Promise<void> => {
    setLoading(true);

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
      )
        .addProperties(filterUndefinedValues(deviceMetaData))
        .build(),
    );
    const restoreResult = await EngineService.initializeVaultFromBackup();
    if (restoreResult.success) {
      replace(...createWalletRestoredNavDetails());
      setLoading(false);
    } else {
      replace(...createWalletResetNeededNavDetails());
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
