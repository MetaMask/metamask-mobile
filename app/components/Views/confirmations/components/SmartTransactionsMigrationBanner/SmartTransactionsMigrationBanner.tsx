import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Linking } from 'react-native';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './SmartTransactionsMigrationBanner.styles';
import { SmartTransactionsMigrationBannerProps } from './SmartTransactionsMigrationBanner.types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  selectSmartTransactionsMigrationApplied,
  selectSmartTransactionsBannerDismissed,
  selectSmartTransactionsOptInStatus
} from '../../../../../selectors/preferencesController';

const SMART_TRANSACTIONS_LEARN_MORE = AppConstants.URLS.SMART_TXS;

const SmartTransactionsMigrationBanner = ({
  style,
}: SmartTransactionsMigrationBannerProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const isEnabled = useSelector(selectSmartTransactionsOptInStatus);
  const isMigrationApplied = useSelector(selectSmartTransactionsMigrationApplied);
  const isBannerDismissed = useSelector(selectSmartTransactionsBannerDismissed);

  const shouldShowBanner = useMemo(
    () => isEnabled && isMigrationApplied && !isBannerDismissed,
    [isEnabled, isMigrationApplied, isBannerDismissed]
  );

  const dismissBanner = useCallback(async () => {
    try {
      const { PreferencesController } = Engine.context;
      PreferencesController.setFeatureFlag('smartTransactionsBannerDismissed', true);
    } catch (error) {
      Logger.error(error as Error, 'Failed to dismiss banner:');
    }
  }, []);

  if (!shouldShowBanner) {
    return null;
  }

  const handleLearnMore = () => {
    Linking.openURL(SMART_TRANSACTIONS_LEARN_MORE);
    dismissBanner();
  };

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      title={strings('smart_transactions_enabled.title')}
      description={
        <Text style={styles.textContainer}>
          <Text onPress={handleLearnMore} style={styles.link}>
            {strings('smart_transactions_enabled.link')}
          </Text>
          <Text style={styles.description}>
            {' '}{strings('smart_transactions_enabled.description')}
          </Text>
        </Text>
      }
      onClose={dismissBanner}
      style={styles.banner}
      testID="smart-transactions-enabled-banner"
    />
  );
};

export default SmartTransactionsMigrationBanner;
