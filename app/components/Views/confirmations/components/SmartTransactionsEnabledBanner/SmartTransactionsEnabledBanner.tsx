import React from 'react';
import { Linking } from 'react-native';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './SmartTransactionsEnabledBanner.styles';
import { SmartTransactionsEnabledBannerProps } from './SmartTransactionsEnabledBanner.types';
// todo: import useSmartTransactionsEnabled from '../../../../../hooks/useSmartTransactionsEnabled';

const SMART_TRANSACTIONS_LEARN_MORE = AppConstants.URLS.SMART_TXS;

const SmartTransactionsEnabledBanner = ({
  style,
  onClose,
}: SmartTransactionsEnabledBannerProps) => {
  const { styles } = useStyles(styleSheet, { style });
  // todo: const { isEnabled, isMigrationApplied } = useSmartTransactionsEnabled();

  // todo: if (!isEnabled || !isMigrationApplied) {
  // todo:   return null;
  // todo: }

  const handleLearnMore = () => {
    Linking.openURL(SMART_TRANSACTIONS_LEARN_MORE);
  };

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      title={strings('smartTransactionsEnabledTitle')}
      description={
        <>
          <Text onPress={handleLearnMore}>
            {strings('smartTransactionsEnabledLink')}
          </Text>
          {strings('smartTransactionsEnabledDescription')}
        </>
      }
      onClose={onClose}
      style={styles.banner}
      testID="smart-transactions-enabled-banner"
    />
  );
};

export default SmartTransactionsEnabledBanner;
