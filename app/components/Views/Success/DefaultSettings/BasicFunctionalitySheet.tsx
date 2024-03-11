// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../component-library/components/Checkbox/Checkbox';
import { useRoute } from '@react-navigation/native';

import createStyles from './BasicFunctionalitySheet.styles';

const BasicFunctionalitySheet = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { params } = useRoute<any>();
  const [isChecked, setIsChecked] = React.useState(false);

  const closeBottomSheet = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const handleSwitchToggle = () => {
    console.log('Switch Toggled');
    closeBottomSheet();
  };

  const renderTurnOffContent = () => (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('default_settings.sheet.title_off')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {strings('default_settings.sheet.description_off_subtitle')}
      </Text>
      <View style={styles.bullets}>
        <Text variant={TextVariant.BodyMD} style={styles.bullet}>
          {'• '} {strings('default_settings.sheet.description_off_1')}
          {'\n'}
          {'• '} {strings('default_settings.sheet.description_off_2')}
          {'\n'}
          {'• '} {strings('default_settings.sheet.description_off_3')}
        </Text>
      </View>
      <View style={styles.bottom}>
        <Checkbox
          label="I understand the risks and want to continue"
          isChecked={isChecked}
          onPress={() => setIsChecked(!isChecked)}
        />
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label="Cancel"
            onPress={closeBottomSheet}
          />
          <View style={styles.spacer} />
          <Button
            variant={ButtonVariants.Primary}
            isDisabled={!isChecked}
            isDanger
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            label="Turn Off"
            onPress={handleSwitchToggle}
          />
        </View>
      </View>
    </View>
  );

  const renderTurnOnContent = () => (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('default_settings.sheet.title_on')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
        {strings('default_settings.sheet.description_on_subtitle')}
      </Text>
      <View style={styles.bullets}>
        <Text variant={TextVariant.BodyMD} style={styles.bullet}>
          {'• '} {strings('default_settings.sheet.description_on_1')}
          {'\n'}
          {'• '} {strings('default_settings.sheet.description_on_2')}
        </Text>
      </View>
      <Text variant={TextVariant.BodyMD} style={styles.subtitle}>
        {strings('default_settings.sheet.description_on_footer')}
      </Text>
      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          style={styles.button}
          accessibilityRole={'button'}
          accessible
          label="Cancel"
          onPress={closeBottomSheet}
        />
        <View style={styles.spacer} />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          style={styles.button}
          accessibilityRole={'button'}
          accessible
          label="Turn On"
          onPress={handleSwitchToggle}
        />
      </View>
    </View>
  );

  return (
    <BottomSheet ref={bottomSheetRef}>
      {!params.isEnabled ? renderTurnOffContent() : renderTurnOnContent()}
    </BottomSheet>
  );
};

export default BasicFunctionalitySheet;
