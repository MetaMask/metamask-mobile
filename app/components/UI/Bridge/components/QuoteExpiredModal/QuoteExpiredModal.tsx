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
import createStyles from './QuoteExpiredModal.styles';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import Engine from '../../../../../core/Engine';
import {
  selectBridgeFeatureFlags,
  selectSourceToken,
  setIsSubmittingTx,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { getQuoteRefreshRate } from '../../utils/quoteUtils';

const QuoteExpiredModal = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const updateQuoteParams = useBridgeQuoteRequest();
  const dispatch = useDispatch();
  const sourceToken = useSelector(selectSourceToken);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const refreshRate =
    getQuoteRefreshRate(bridgeFeatureFlags, sourceToken) / 1000;

  const handleClose = () => {
    navigation.goBack();
  };

  const handleGetNewQuote = () => {
    dispatch(setIsSubmittingTx(false));
    // Reset bridge controller state
    if (Engine.context.BridgeController?.resetState) {
      Engine.context.BridgeController.resetState();
    }
    // Update quote params to fetch new quote
    updateQuoteParams();
    // Close the modal
    navigation.goBack();
  };

  const footerButtonProps = [
    {
      label: strings('quote_expired_modal.get_new_quote'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleGetNewQuote,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('quote_expired_modal.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          {strings('quote_expired_modal.description', {
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

export default QuoteExpiredModal;
