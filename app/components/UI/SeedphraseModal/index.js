import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';

const createStyles = (colors) =>
  StyleSheet.create({
    modalContainer: {
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    explanationText: {
      fontSize: 14,
      marginTop: 16,
      textAlign: 'left',
      ...fontStyles.normal,
      color: colors.text.default,
      lineHeight: 20,
    },
    list: {
      marginTop: 24,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    bullet: {
      fontSize: 20,
      marginRight: 10,
    },
    itemText: {
      fontSize: 16,
    },
    listContainer: {
      marginLeft: 10,
    },
    explanationTextContainer: {
      flexDirection: 'column',
    },
    buttonContainer: {
      marginTop: 16,
      width: '100%',
    },
  });

const SeedphraseModal = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef(null);
  const navigation = useNavigation();

  const seedPhrasePoints = [
    strings('account_backup_step_1.seedPhrase_point_1'),
    strings('account_backup_step_1.seedPhrase_point_2'),
    strings('account_backup_step_1.seedPhrase_point_3'),
  ];

  const hideWhatIsSeedphrase = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View style={styles.modalContainer}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('account_backup_step_1.what_is_seedphrase_title')}
          </Text>
        </View>
        <View style={styles.explanationTextContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('account_backup_step_1.what_is_seedphrase_text_1')}
          </Text>
          <View style={styles.list}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
              {strings('account_backup_step_1.what_is_seedphrase_text_4')}
            </Text>
            <View style={styles.listContainer}>
              {seedPhrasePoints.map((point) => (
                <View style={styles.listItem} key={point}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={hideWhatIsSeedphrase}
            label={strings('account_backup_step_1.what_is_seedphrase_confirm')}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default SeedphraseModal;
