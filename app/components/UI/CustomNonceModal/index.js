import React from 'react';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import {
  StyleSheet,
  View,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ModalDragger from '../../Base/ModalDragger';
import Text from '../../Base/Text';
import StyledButton from '../../UI/StyledButton';
import Modal from 'react-native-modal';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { useTheme } from '../../../util/theme';

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
      margin: 24,
    },
    title: {
      fontSize: 14,
      color: colors.text.default,
    },
    nonceInput: {
      width: 80,
      fontSize: 36,
      ...fontStyles.bold,
      color: colors.text.default,
      textAlign: 'center',
      marginHorizontal: 24,
    },
    desc: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      marginVertical: 10,
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
      borderWidth: 1,
      borderColor: colors.warning.default,
      backgroundColor: colors.warning.muted,
      padding: 16,
      display: 'flex',
      flexDirection: 'row',
      borderRadius: 8,
      marginTop: 10,
      marginBottom: 16,
    },
    nonceWarningText: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      width: '100%',
      flex: 1,
    },
    descWarningContainer: {
      height: 240,
    },
    actionRow: {
      flexDirection: 'row',
      marginBottom: 15,
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 8,
    },
    incrementHit: {
      padding: 4,
    },
    icon: {
      flex: 0,
      marginTop: 6,
      paddingRight: 14,
    },
    incrementDecrementIcon: {
      color: colors.primary.default,
    },
  });

const CustomModalNonce = ({ proposedNonce, nonceValue, close, save }) => {
  const [nonce, onChangeText] = React.useState(nonceValue);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const incrementDecrementNonce = (decrement) => {
    let newValue = nonce;
    newValue = decrement ? --newValue : ++newValue;
    onChangeText(newValue > 1 ? newValue : 1);
  };

  const saveAndClose = () => {
    save(nonce);
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
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.keyboardAwareWrapper}
      >
        <SafeAreaView style={styles.modal}>
          <ModalDragger />
          <View style={styles.modalContainer}>
            <Text bold centered style={styles.title}>
              {strings('transaction.edit_transaction_nonce')}
            </Text>
            <View style={styles.nonceInputContainer}>
              <TextInput
                // disable keyboard for now
                showSoftInputOnFocus={false}
                keyboardType="numeric"
                // autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onChangeText}
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
            </View>
            <Text centered style={styles.currentSuggested}>
              {strings('transaction.current_suggested_nonce')}{' '}
              <Text bold>{proposedNonce}</Text>
            </Text>
            <View style={styles.incrementDecrementNonceContainer}>
              <TouchableOpacity
                style={styles.incrementHit}
                onPress={() => incrementDecrementNonce(true)}
              >
                <EvilIcons
                  name="minus"
                  size={64}
                  style={styles.incrementDecrementIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.incrementHit}
                onPress={() => incrementDecrementNonce(false)}
              >
                <EvilIcons
                  name="plus"
                  size={64}
                  style={styles.incrementDecrementIcon}
                />
              </TouchableOpacity>
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
              <Text bold style={styles.desc}>
                {strings('transaction.this_is_an_advanced')}
              </Text>
              <Text style={styles.desc}>
                {strings('transaction.think_of_the_nonce')}
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <StyledButton
              type={'normal'}
              containerStyle={styles.actionButton}
              onPress={close}
            >
              {strings('transaction.cancel')}
            </StyledButton>
            <StyledButton
              type={'blue'}
              onPress={() => saveAndClose(nonce)}
              containerStyle={styles.actionButton}
            >
              {strings('transaction.save')}
            </StyledButton>
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
