import React, { useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import { useNavigation } from '@react-navigation/native';

const createStyles = (colors) =>
  StyleSheet.create({
    modalContainer: {
      flexDirection: 'column',
    },
    explanationText: {
      marginTop: 16,
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
      marginRight: 12,
    },
    listContainer: {
      marginLeft: 12,
    },
    buttonContainer: {
      paddingTop: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
      width: '100%',
    },
    contentContainer: {
      paddingHorizontal: 16,
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
        <HeaderCenter
          title={strings('account_backup_step_1.what_is_seedphrase_title')}
          onClose={hideWhatIsSeedphrase}
        />
        <View style={styles.contentContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('account_backup_step_1.what_is_seedphrase_text_1')}
          </Text>
          <View style={styles.list}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('account_backup_step_1.what_is_seedphrase_text_4')}
            </Text>
            <View style={styles.listContainer}>
              {seedPhrasePoints.map((point) => (
                <View style={styles.listItem} key={point}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
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
