import React from 'react';
import { fontStyles } from '../../../../../../../styles/common';
import { strings } from '../../../../../../../../locales/i18n';
import {
  StyleSheet,
  View,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ModalDragger from '../../../../../../Base/ModalDragger';
import Text from '../../../../../../Base/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../../component-library/components/Buttons/Button';
import Modal from 'react-native-modal';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../../../../../../util/theme';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';
import { isNumber } from '../../../../../../../util/number';

const createStyles = (colors) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    keyboardAwareWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modal: {
      minHeight: 200,
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    modalContainer: {
      marginHorizontal: 16,
    },
    title: {
      fontSize: 16,
      color: colors.text.default,
    },
    nonceInput: {
      minWidth: 80,
      maxWidth: 200,
      fontSize: 56,
      ...fontStyles.bold,
      color: colors.text.default,
      textAlign: 'center',
      flex: 1,
    },
    desc: {
      color: colors.text.alternative,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 8,
      marginVertical: 0,
    },
    nonceControlsContainer: {
      marginTop: 32,
      marginBottom: 32,
    },
    nonceInputContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      marginVertical: 10,
    },
    incrementDecrementNonceContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
    },
    currentSuggested: {
      fontSize: 14,
      color: colors.text.alternative,
      marginBottom: 10,
    },
    nonceWarning: {
      backgroundColor: colors.warning.muted,
      paddingVertical: 12,
      paddingHorizontal: 16,
      display: 'flex',
      flexDirection: 'row',
      borderRadius: 8,
      marginBottom: 16,
    },
    nonceWarningText: {
      color: colors.text.default,
      fontSize: 16,
      lineHeight: 24,
      width: '100%',
      flex: 1,
    },
    descWarningContainer: {},
    actionRow: {
      flexDirection: 'row',
      marginTop: 16,
      marginHorizontal: 16,
      gap: 16,
    },
    actionButton: {
      flex: 1,
    },
    incrementHit: {
      padding: 4,
      backgroundColor: colors.background.muted,
    },
    icon: {
      flex: 0,
      marginTop: 6,
      paddingRight: 14,
    },
  });

const CustomModalNonce = ({ proposedNonce, nonceValue, close, save }) => {
  const [nonce, onChangeText] = React.useState(nonceValue);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const incrementDecrementNonce = (isDecrement) => {
    const currentNonce = Number(nonce);
    const updatedValue = isDecrement ? currentNonce - 1 : currentNonce + 1;
    const clampedValue = Math.max(updatedValue, 0);

    onChangeText(clampedValue);
  };

  const saveAndClose = () => {
    const numberNonce = Number(nonce);
    save(numberNonce);
    close();
  };

  const displayWarning = String(proposedNonce) !== String(nonce);

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={close}
      onBackButtonPress={close}
      onSwipeComplete={close}
      swipeDirection={'down'}
      propagateSwipe
      useNativeDriver
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareWrapper}
      >
        <SafeAreaView style={styles.modal}>
          <ModalDragger borderless />
          <View style={styles.modalContainer}>
            <Text bold centered style={styles.title}>
              {strings('transaction.edit_transaction_nonce')}
            </Text>
            <View style={styles.nonceControlsContainer}>
              <View style={styles.nonceInputContainer}>
                <ButtonIcon
                  iconName={IconName.Minus}
                  size={ButtonIconSizes.Lg}
                  iconColor={IconColor.Default}
                  onPress={() => incrementDecrementNonce(true)}
                  testID={'decrement-nonce'}
                  style={styles.incrementHit}
                />
                <TextInput
                  // disable keyboard for now
                  showSoftInputOnFocus={false}
                  keyboardType="numeric"
                  // autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(text) => {
                    if (isNumber(text)) {
                      onChangeText(text);
                    }
                  }}
                  placeholder={String(proposedNonce)}
                  placeholderTextColor={colors.text.muted}
                  spellCheck={false}
                  editable
                  style={styles.nonceInput}
                  value={String(nonce)}
                  numberOfLines={1}
                  onSubmitEditing={saveAndClose}
                  keyboardAppearance={themeAppearance}
                />
                <ButtonIcon
                  iconName={IconName.Add}
                  size={ButtonIconSizes.Lg}
                  iconColor={IconColor.Default}
                  onPress={() => incrementDecrementNonce(false)}
                  testID={'increment-nonce'}
                  style={styles.incrementHit}
                />
              </View>
              <Text centered style={styles.currentSuggested}>
                {strings('transaction.current_suggested_nonce')}{' '}
                <Text bold>{proposedNonce}</Text>
              </Text>
            </View>
            <View style={styles.descWarningContainer}>
              {displayWarning ? (
                <View style={styles.nonceWarning}>
                  <Icon
                    name="exclamation-circle"
                    color={colors.warning.default}
                    size={16}
                    style={styles.icon}
                  />
                  <Text style={styles.nonceWarningText}>
                    {strings('transaction.nonce_warning')}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.desc}>
                {strings('transaction.this_is_an_advanced')}
              </Text>
              <Text style={styles.desc}>
                {strings('transaction.think_of_the_nonce')}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Button
              variant={ButtonVariants.Secondary}
              style={styles.actionButton}
              onPress={close}
              label={strings('transaction.cancel')}
              size={ButtonSize.Lg}
            />
            <Button
              variant={ButtonVariants.Primary}
              onPress={() => saveAndClose(nonce)}
              style={styles.actionButton}
              label={strings('transaction.save')}
              size={ButtonSize.Lg}
            />
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </Modal>
  );
};

CustomModalNonce.propTypes = {
  proposedNonce: PropTypes.number.isRequired,
  nonceValue: PropTypes.number.isRequired,
  save: PropTypes.func.isRequired,
  close: PropTypes.func.isRequired,
};

export default CustomModalNonce;
