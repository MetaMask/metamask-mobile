import React, { useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import ActionContent from '../ActionModal/ActionContent';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';

const createStyles = (colors) =>
  StyleSheet.create({
    whatIsSeedphraseTitle: {
      flex: 1,
      fontSize: 18,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.bold,
    },
    modalNoBorder: {
      borderTopWidth: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      width: '100%',
      marginTop: 16,
      marginBottom: Platform.OS === 'ios' ? 8 : 16,
    },
    modalContainer: {
      flex: 1,
      paddingTop: 24,
      flexDirection: 'column',
    },
    modalXButton: {
      padding: 5,
      alignItems: 'flex-end',
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    auxCenterView: {
      width: 26,
    },
    explanationText: {
      fontSize: 14,
      marginTop: 16,
      textAlign: 'left',
      ...fontStyles.normal,
      color: colors.text.default,
      lineHeight: 20,
    },
    modalXIcon: {
      fontSize: 16,
      color: colors.text.default,
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
      gap: 16,
    },
  });

const SeedphraseModal = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef(null);

  const seedPhrasePoints = [
    strings('account_backup_step_1.seedPhrase_point_1'),
    strings('account_backup_step_1.seedPhrase_point_2'),
    strings('account_backup_step_1.seedPhrase_point_3'),
  ];

  const hideWhatIsSeedphrase = () => {
    bottomSheetRef.current?.onCloseBottomSheet?.();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <ActionContent
        actionContainerStyle={styles.modalNoBorder}
        displayCancelButton={false}
        onRequestClose={hideWhatIsSeedphrase}
        confirmText={strings(
          'account_backup_step_1.what_is_seedphrase_confirm',
        )}
        confirmButtonMode={'blue'}
        onConfirmPress={hideWhatIsSeedphrase}
      >
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
            <View>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('account_backup_step_1.what_is_seedphrase_text_4')}
              </Text>
              <View style={styles.listContainer}>
                {seedPhrasePoints.map((point, index) => (
                  <View style={styles.listItem} key={index}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                    >
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ActionContent>
    </BottomSheet>
  );
};

export default SeedphraseModal;
