import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsQuoteExpiredModal.styles';
import { DEPOSIT_CONFIG } from '@metamask/perps-controller';

const PerpsQuoteExpiredModal = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(createStyles, {});
  const refreshRate = DEPOSIT_CONFIG.RefreshRate / 1000; // Convert to seconds

  const handleGetNewQuote = () => {
    // The quote will be automatically refreshed when we navigate back
    // because the usePerpsDepositQuote hook will re-run
    navigation.goBack();
  };

  return (
    <BottomSheet goBack={navigation.goBack}>
      <BottomSheetHeader onClose={navigation.goBack}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.deposit.quote_expired_modal.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          {strings('perps.deposit.quote_expired_modal.description', {
            refreshRate,
          })}
        </Text>
      </View>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('perps.deposit.quote_expired_modal.get_new_quote'),
          onPress: handleGetNewQuote,
          size: ButtonSize.Lg,
        }}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PerpsQuoteExpiredModal;
