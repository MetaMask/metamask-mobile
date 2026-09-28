import React, { useCallback, useRef } from 'react';
import { fontStyles } from '../../../../../../styles/common';
import { strings } from '../../../../../../../locales/i18n';
import {
  Modal,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Text from '../../../../../Base/Text';
import StyledButton from '../../../../../UI/StyledButton';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/FontAwesome';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { useTheme } from '../../../../../../util/theme';
import { isNumber } from '../../../../../../util/number';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
} from '@metamask/design-system-react-native';

const createStyles = (theme) => {
  const { colors } = theme;

  return StyleSheet.create({
    title: {
      fontSize: 14,
      color: colors.text.default,
    },
    nonceInput: {
      minWidth: 80,
      maxWidth: 200,
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
    actionRow: {
      flexDirection: 'row',
      marginBottom: 16,
      marginTop: 16,
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
};

const CustomModalNonce = ({ proposedNonce, nonceValue, close, save }) => {
  const [nonce, onChangeText] = React.useState(nonceValue);
  const bottomSheetRef = useRef(null);
  const theme = useTheme();
  const { colors, themeAppearance } = theme;
  const styles = createStyles(theme);

  const incrementDecrementNonce = (isDecrement) => {
    const currentNonce = Number(nonce);
    const updatedValue = isDecrement ? currentNonce - 1 : currentNonce + 1;
    const clampedValue = Math.max(updatedValue, 0);

    onChangeText(clampedValue);
  };

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    close();
  }, [close]);

  const saveAndClose = () => {
    const numberNonce = Number(nonce);
    save(numberNonce);
    handleRequestClose();
  };

  const displayWarning = String(proposedNonce) !== String(nonce);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader onClose={handleRequestClose}>
          {strings('transaction.edit_transaction_nonce')}
        </BottomSheetHeader>
        <Box twClassName="flex flex-col p-4 pt-0">
          <View style={styles.nonceInputContainer}>
            <TextInput
              showSoftInputOnFocus={false}
              keyboardType="numeric"
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
          </View>
          <Text centered style={styles.currentSuggested}>
            {strings('transaction.current_suggested_nonce')}{' '}
            <Text bold>{proposedNonce}</Text>
          </Text>
          <View style={styles.incrementDecrementNonceContainer}>
            <TouchableOpacity
              style={styles.incrementHit}
              onPress={() => incrementDecrementNonce(true)}
              testID="decrement-nonce"
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
              testID="increment-nonce"
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
          <View style={styles.actionRow}>
            <StyledButton
              type="normal"
              containerStyle={styles.actionButton}
              onPress={handleRequestClose}
            >
              {strings('transaction.cancel')}
            </StyledButton>
            <StyledButton
              type="blue"
              onPress={() => saveAndClose(nonce)}
              containerStyle={styles.actionButton}
            >
              {strings('transaction.save')}
            </StyledButton>
          </View>
        </Box>
      </BottomSheet>
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
