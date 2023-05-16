import React, { useCallback, useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StyledButton from '../../UI/StyledButton';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppThemeFromContext } from '../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createRestoreWalletNavDetails } from './RestoreWallet';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { trackEventV2 as trackEvent } from '../../../util/analyticsV2';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';

export const createWalletResetNeededNavDetails = createNavigationDetails(
  Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED,
);

const WalletResetNeeded = () => {
  const { colors } = useAppThemeFromContext();
  const styles = createStyles(colors);

  const navigation = useNavigation<StackNavigationProp<any>>();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED,
      deviceMetaData,
    );
  }, [deviceMetaData]);

  const handleCreateNewWallet = useCallback(async () => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_CREATE_NEW_WALLET_BUTTON_PRESSED,
      deviceMetaData,
    );
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  }, [deviceMetaData, navigation]);

  const handleTryAgain = useCallback(async () => {
    trackEvent(
      MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_TRY_AGAIN_BUTTON_PRESSED,
      deviceMetaData,
    );
    navigation.replace(
      ...createRestoreWalletNavDetails({
        previousScreen: Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED,
      }),
    );
  }, [deviceMetaData, navigation]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.images}>
          <Icon
            name={IconName.Danger}
            size={IconSize.XXL}
            color={colors.error.default}
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('new_wallet_needed.new_wallet_needed_title')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('new_wallet_needed.new_wallet_needed_description_part_one')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings('new_wallet_needed.new_wallet_needed_description_part_two')}
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.description}>
          {strings(
            'new_wallet_needed.new_wallet_needed_description_part_three',
          )}
        </Text>
      </ScrollView>
      <View style={styles.actionButtonWrapper}>
        <StyledButton
          type="confirm"
          containerStyle={styles.actionButton}
          onPress={handleTryAgain}
        >
          {strings(
            'new_wallet_needed.new_wallet_needed_create_try_again_action',
          )}
        </StyledButton>
        <StyledButton
          type="normal"
          containerStyle={styles.actionButton}
          onPress={handleCreateNewWallet}
        >
          {strings(
            'new_wallet_needed.new_wallet_needed_create_new_wallet_action',
          )}
        </StyledButton>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(WalletResetNeeded);
