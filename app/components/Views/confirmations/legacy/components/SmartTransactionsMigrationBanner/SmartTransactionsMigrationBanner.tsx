import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Linking } from 'react-native';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import styleSheet from './SmartTransactionsMigrationBanner.styles';
import { SmartTransactionsMigrationBannerProps } from './SmartTransactionsMigrationBanner.types';
import { selectShouldUseSmartTransaction } from '../../../../../../selectors/smartTransactionsController';
import { selectEvmChainId } from '../../../../../../selectors/networkController';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectSmartTransactionsMigrationApplied,
  selectSmartTransactionsBannerDismissed,
} from '../../../../../../selectors/preferencesController';
import { RootState } from '../../../../../../reducers';

const SmartTransactionsMigrationBanner = ({
  style,
}: SmartTransactionsMigrationBannerProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const isMigrationApplied = useSelector(
    selectSmartTransactionsMigrationApplied,
  );
  const isBannerDismissed = useSelector(selectSmartTransactionsBannerDismissed);
  const chainId = useSelector(selectEvmChainId);

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const dismissBanner = useCallback(async () => {
    try {
      const { PreferencesController } = Engine.context;
      PreferencesController.setFeatureFlag(
        'smartTransactionsBannerDismissed',
        true,
      );
    } catch (error) {
      Logger.error(error as Error, 'Failed to dismiss banner:');
    }
  }, []);

  const shouldShowBanner = useMemo(
    () => isMigrationApplied && !isBannerDismissed && shouldUseSmartTransaction,
    [isMigrationApplied, isBannerDismissed, shouldUseSmartTransaction],
  );

  if (!shouldShowBanner) {
    return null;
  }

  const handleLearnMore = () => {
    Linking.openURL(AppConstants.URLS.SMART_TXS);
    dismissBanner();
  };

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      title={strings('smart_transactions_migration.title')}
      description={
        <Text style={styles.textContainer}>
          <Text onPress={handleLearnMore} style={styles.link}>
            {strings('smart_transactions_migration.link')}
          </Text>
          <Text style={styles.description}>
            {' '}
            {strings('smart_transactions_migration.description')}
          </Text>
        </Text>
      }
      onClose={dismissBanner}
      style={styles.banner}
      testID="smart-transactions-migration-banner"
    />
  );
};

export default SmartTransactionsMigrationBanner;
