import React from 'react';
import { Linking, View } from 'react-native';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './SmartTransactionsEnabledBanner.styles';
import { SmartTransactionsEnabledBannerProps } from './SmartTransactionsEnabledBanner.types';
import useSmartTransactionsEnabled from '../../../../hooks/useSmartTransactionsEnabled/useSmartTransactionsEnabled';

const SMART_TRANSACTIONS_LEARN_MORE = AppConstants.URLS.SMART_TXS;

const SmartTransactionsEnabledBanner = ({
  style,
}: SmartTransactionsEnabledBannerProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const { shouldShowBanner, dismissBanner } = useSmartTransactionsEnabled();

  if (!shouldShowBanner) {
    return null;
  }

  const handleLearnMore = () => {
    Linking.openURL(SMART_TRANSACTIONS_LEARN_MORE);
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

export default SmartTransactionsEnabledBanner;
