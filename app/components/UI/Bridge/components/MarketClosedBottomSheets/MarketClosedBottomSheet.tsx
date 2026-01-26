import React, { useRef } from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './MarketClosedBottomSheet.styles';

const MARKET_HOURS_LEARN_MORE_URL = 'https://support.metamask.io';

const MarketClosedBottomSheet = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const handleClose = () => {
    navigation.goBack();
  };

  const handleLearnMore = () => {
    Linking.openURL(MARKET_HOURS_LEARN_MORE_URL);
  };

  const footerButtonProps = [
    {
      label: strings('bridge.market_closed.done'),
      variant: ButtonVariants.Secondary,
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('bridge.market_closed.title')}
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          {strings('bridge.market_closed.description')}{' '}
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Info}
            onPress={handleLearnMore}
          >
            {strings('bridge.market_closed.learn_more')}
          </Text>
        </Text>
      </View>
      <BottomSheetFooter
        buttonPropsArray={footerButtonProps}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default MarketClosedBottomSheet;
