import React, { useRef } from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheetFooter,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './MarketClosedBottomSheet.styles';

const MarketClosedBottomSheet = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const handleClose = () => {
    navigation.goBack();
  };

  const handleLearnMore = () => {
    Linking.openURL(strings('bridge.market_closed.learn_more_url'));
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('bridge.market_closed.title')}
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD} testID="market-closed-description">
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
        testID="bottomsheetfooter"
        secondaryButtonProps={{
          children: strings('bridge.market_closed.done'),
          onPress: handleClose,
          size: ButtonSize.Lg,
          testID: 'bottomsheetfooter-button',
        }}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default MarketClosedBottomSheet;
