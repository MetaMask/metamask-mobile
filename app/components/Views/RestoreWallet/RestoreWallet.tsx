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
import { trackEventV2 as trackEvent } from '../../../util/analyticsV2';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { StackNavigationProp } from '@react-navigation/stack';

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
  const { colors } = useAppThemeFromContext();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState<boolean>(false);

  const { replace } = useNavigation<StackNavigationProp<any>>();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);
  const { previousScreen } = useParams<RestoreWalletParams>();

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
      { ...deviceMetaData, previousScreen },
    );
  }, [deviceMetaData, previousScreen]);

  const handleOnNext = useCallback(async (): Promise<void> => {
    setLoading(true);
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
      deviceMetaData,
    );
    const restoreResult = await EngineService.initializeVaultFromBackup();
    if (restoreResult.success) {
      replace(...createWalletRestoredNavDetails());
      setLoading(false);
    } else {
      replace(...createWalletResetNeededNavDetails());
      setLoading(false);
    }
  }, [deviceMetaData, replace]);

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
