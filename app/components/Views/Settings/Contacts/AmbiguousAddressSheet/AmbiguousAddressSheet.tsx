// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

// Internal dependencies
import createStyles from './AmbiguousAddressSheet.styles';

/**
 * AmbiguousAddressSheet Component.
 *
 */
const AmbiguousAddressSheet = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const sheetRef = useRef<BottomSheetRef>(null);

  const onCancelPress = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('duplicate_address.title')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('duplicate_address.body')}
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label={strings('duplicate_address.button')}
            onPress={onCancelPress}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default AmbiguousAddressSheet;
