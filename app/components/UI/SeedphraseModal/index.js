import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import ActionModal from '../../UI/ActionModal';
import { useTheme } from '../../../util/theme';
import ActionContent from '../ActionModal/ActionContent';
// import Icon, {
//   IconName,
//   IconSize,
// } from '../../../component-library/components/Icons/Icon';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';

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
  });

const SeedphraseModal = ({
  showWhatIsSeedphraseModal,
  hideWhatIsSeedphrase,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const seedPhrasePoints = [
    strings('account_backup_step_1.seedPhrase_point_1'),
    strings('account_backup_step_1.seedPhrase_point_2'),
    strings('account_backup_step_1.seedPhrase_point_3'),
  ];

  return showWhatIsSeedphraseModal ? (
    <BottomSheet onClose={hideWhatIsSeedphrase}>
      <ActionContent
        actionContainerStyle={styles.modalNoBorder}
        displayCancelButton={false}
        onRequestClose={hideWhatIsSeedphrase}
        confirmText={strings(
          'account_backup_step_1.what_is_seedphrase_confirm',
        )}
        confirmButtonMode={'blue'}
      >
        <View style={styles.modalContainer}>
          <View style={styles.titleContainer}>
            <View style={styles.auxCenterView} />
            <Text style={styles.whatIsSeedphraseTitle}>
              {strings('account_backup_step_1.what_is_seedphrase_title')}
            </Text>
          </View>
          <View>
            <Text style={styles.explanationText}>
              {strings('account_backup_step_1.what_is_seedphrase_text_1')}
            </Text>
            <Text style={styles.explanationText}>
              {strings('account_backup_step_1.what_is_seedphrase_text_4')}
            </Text>
            <View style={styles.listContainer}>
              {seedPhrasePoints.map((point, index) => (
                <View style={styles.listItem} key={index}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ActionContent>
    </BottomSheet>
  ) : null;
};

SeedphraseModal.propTypes = {
  /**
  /* Show or hide modal
  */
  showWhatIsSeedphraseModal: PropTypes.bool,
  /**
  /* Function to hide modal
  */
  hideWhatIsSeedphrase: PropTypes.func,
};

export default SeedphraseModal;
