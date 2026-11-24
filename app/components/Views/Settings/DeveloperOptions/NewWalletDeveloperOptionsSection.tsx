import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import CookieManager from '@react-native-cookies/cookies';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import { Authentication } from '../../../../core';
import Engine from '../../../../core/Engine';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import AppConstants from '../../../../core/AppConstants';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  OPTIN_META_METRICS_UI_SEEN,
  TRUE,
  USE_TERMS,
} from '../../../../constants/storage';
import { clearHistory } from '../../../../actions/browser';
import {
  seedphraseBackedUp,
  setMultichainAccountsIntroModalSeen,
} from '../../../../actions/user';
import { storePrivacyPolicyClickedOrClosed } from '../../../../actions/legalNotices';
import { setLockTime } from '../../../../actions/settings';
import { resetFiatOrders } from '../../../../reducers/fiatOrders';
import { getDevAutoUnlockPassword } from '../../../../util/environment';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { RootState } from '../../../../reducers';

export const NEW_WALLET_BUTTON_TEST_ID = 'new-wallet-dev-create-button';

// Read before the wipe: deleteWallet resets the keychain entry.
async function resolveSavedPassword(): Promise<string | undefined> {
  const envPassword =
    getDevAutoUnlockPassword() ?? process.env.PREDEFINED_PASSWORD;
  if (envPassword) {
    return envPassword;
  }
  const credentials = await Authentication.getPassword();
  return credentials ? credentials.password : undefined;
}

// Engine.resetState skips RampsController, so drop its session, orders and autoramps here.
function resetRampsState() {
  const { RampsController } = Engine.context;
  RampsController.transakResetState();
  // Sync-applied removals stay local, so the old profile's synced orders are not tombstoned.
  RampsController.setIsApplyingOrderSyncChanges(true);
  try {
    [...RampsController.state.orders].forEach((order) => {
      RampsController.removeOrder(order.providerOrderId);
    });
  } finally {
    RampsController.setIsApplyingOrderSyncChanges(false);
  }
  [...RampsController.state.autoramps].forEach((autoramp) => {
    RampsController.removeAutoramp(autoramp.id);
  });
}

export default function NewWalletDeveloperOptionsSection() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const dispatch = useDispatch();
  const { isEnabled } = useAnalytics();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  const [isRunning, setIsRunning] = useState(false);

  const createNewWallet = useCallback(async () => {
    setIsRunning(true);
    try {
      const password = await resolveSavedPassword();
      if (!password) {
        Alert.alert(
          strings(
            'app_settings.developer_options.new_wallet.no_password_title',
          ),
          strings(
            'app_settings.developer_options.new_wallet.no_password_message',
          ),
        );
        return;
      }

      // Same cleanup as Settings > Reset wallet.
      dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
      await CookieManager.clearAll(true);
      await Authentication.deleteWallet();
      dispatch(resetFiatOrders());
      resetRampsState();

      // Same path as onboarding "Create new wallet"; falls back to password without biometrics.
      const authType = await Authentication.componentAuthenticationType(
        true,
        false,
      );
      authType.currentAuthType =
        await Authentication.requestBiometricsAccessControlForIOS(
          authType.currentAuthType,
        );
      await Authentication.newWalletAndKeychain(password, authType);

      // Skip the post-onboarding prompts, like generateSkipOnboardingState does.
      dispatch(seedphraseBackedUp());
      dispatch(storePrivacyPolicyClickedOrClosed());
      dispatch(setMultichainAccountsIntroModalSeen(true));
      dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT));
      await StorageWrapper.setItem(USE_TERMS, TRUE);
      await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);

      NavigationService.navigation?.reset({
        index: 0,
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
      Alert.alert(strings('app_settings.developer_options.new_wallet.success'));
    } catch (error) {
      Alert.alert(
        strings('app_settings.developer_options.new_wallet.failure'),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsRunning(false);
    }
  }, [dispatch, isEnabled, isDataCollectionForMarketingEnabled]);

  const confirmCreate = useCallback(() => {
    Alert.alert(
      strings('app_settings.developer_options.new_wallet.confirm_title'),
      strings('app_settings.developer_options.new_wallet.confirm_message'),
      [
        {
          text: strings('app_settings.developer_options.new_wallet.cancel'),
          style: 'cancel',
        },
        {
          text: strings('app_settings.developer_options.new_wallet.confirm'),
          style: 'destructive',
          onPress: createNewWallet,
        },
      ],
    );
  }, [createNewWallet]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.new_wallet.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.new_wallet.description')}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={confirmCreate}
        isDisabled={isRunning}
        isLoading={isRunning}
        isFullWidth
        style={styles.accessory}
        testID={NEW_WALLET_BUTTON_TEST_ID}
      >
        {strings('app_settings.developer_options.new_wallet.button')}
      </Button>
    </>
  );
}
