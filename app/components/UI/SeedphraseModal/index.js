import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'stretch',
      flexDirection: 'column',
      rowGap: 16,
      padding: 16,
      width: '100%',
    },
    header: {
      alignItems: 'stretch',
      flexDirection: 'column',
      rowGap: 8,
      width: '100%',
    },
    centeredText: {
      textAlign: 'center',
    },
    points: {
      alignItems: 'stretch',
      flexDirection: 'column',
      marginVertical: 16,
      rowGap: 16,
      width: '100%',
    },
    point: {
      alignItems: 'flex-start',
      columnGap: 16,
      flexDirection: 'row',
      width: '100%',
    },
    pointIcon: {
      alignItems: 'center',
      backgroundColor: colors.background.muted,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    pointText: {
      flex: 1,
    },
    separator: {
      backgroundColor: colors.border.default,
      height: StyleSheet.hairlineWidth,
      marginLeft: 56,
    },
  });

const SeedphraseModal = () => {
  const bottomSheetRef = useRef(null);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const hideWhatIsSeedphrase = () => {
    if (bottomSheetRef.current?.onCloseBottomSheet) {
      bottomSheetRef.current.onCloseBottomSheet(() => navigation.goBack());
      return;
    }
    navigation.goBack();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={styles.centeredText}
          >
            {strings('account_backup_step_1.what_is_seedphrase_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.centeredText}
          >
            {strings('account_backup_step_1.what_is_seedphrase_text_1')}
          </Text>
        </View>

        <View style={styles.points}>
          <View style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon
                name={IconName.Danger}
                size={IconSize.Md}
                color={IconColor.ErrorDefault}
              />
            </View>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              style={styles.pointText}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings(
                  'account_backup_step_1.what_is_seedphrase_warning_title',
                )}
                {'. '}
              </Text>
              {strings('account_backup_step_1.what_is_seedphrase_text_2')}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon
                name={IconName.SecurityKey}
                size={IconSize.Md}
                color={IconColor.Default}
              />
            </View>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              style={styles.pointText}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings(
                  'account_backup_step_1.what_is_seedphrase_storage_title',
                )}
                {'. '}
              </Text>
              {strings('account_backup_step_1.what_is_seedphrase_text_3')}
            </Text>
          </View>
        </View>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={hideWhatIsSeedphrase}
        >
          {strings('account_backup_step_1.what_is_seedphrase_confirm')}
        </Button>
      </View>
    </BottomSheet>
  );
};

export default SeedphraseModal;
