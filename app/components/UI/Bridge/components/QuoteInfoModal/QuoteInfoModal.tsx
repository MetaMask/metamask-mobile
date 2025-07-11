import React, { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './QuoteInfoModal.styles';

const QuoteInfoModal = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});

  const handleClose = () => {
    navigation.goBack();
  };

  // TODO: Footer button implementation will be added in a future version
  // This will allow users to see other quotes after viewing the current quote details
  // const footerButtonProps = [
  //   {
  //     label: strings('bridge.see_other_quotes'),
  //     variant: ButtonVariants.Secondary,
  //     size: ButtonSize.Lg,
  //     onPress: handleClose,
  //   },
  // ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.quote_info_title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          {strings('bridge.quote_info_content')}
        </Text>
        {/* TODO: Footer component will be re-enabled when the footer button functionality is implemented
        <BottomSheetFooter
          buttonPropsArray={footerButtonProps}
          style={styles.footer}
        /> */}
      </View>
    </BottomSheet>
  );
};

export default QuoteInfoModal;
