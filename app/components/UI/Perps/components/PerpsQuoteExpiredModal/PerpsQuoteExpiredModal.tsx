import React, { useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsQuoteExpiredModal.styles';
import { DEPOSIT_CONFIG } from '../../constants/hyperLiquidConfig';

const PerpsQuoteExpiredModal = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const refreshRate = DEPOSIT_CONFIG.RefreshRate / 1000; // Convert to seconds

  const handleClose = () => {
    navigation.goBack();
  };

  const handleGetNewQuote = () => {
    // The quote will be automatically refreshed when we navigate back
    // because the usePerpsDepositQuote hook will re-run
    navigation.goBack();
  };

  const footerButtonProps = [
    {
      label: strings('perps.deposit.quote_expired_modal.get_new_quote'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleGetNewQuote,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
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
        buttonPropsArray={footerButtonProps}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default PerpsQuoteExpiredModal;
