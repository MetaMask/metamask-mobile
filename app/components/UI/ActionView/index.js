import React from 'react';
import PropTypes from 'prop-types';
import {
  Keyboard,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../../../util/theme';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

export const ConfirmButtonState = {
  Error: 'error',
  Warning: 'warning',
  Normal: 'normal',
};

const getStyles = (colors) =>
  StyleSheet.create({
    actionContainer: {
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 16,
      width: '100%',
    },
    button: {
      flex: 1,
    },
    confirmButtonWarning: {
      backgroundColor: colors.warning.default,
      borderColor: colors.warning.default,
    },
  });

/**
 * PureComponent that renders scrollable content above configurable buttons
 */
export default function ActionView({
  cancelTestID,
  confirmTestID,
  cancelText,
  children,
  confirmText,
  confirmButtonMode,
  onCancelPress,
  onConfirmPress,
  onTouchablePress,
  showCancelButton,
  showConfirmButton,
  confirmed,
  confirmDisabled,
  loading = false,
  keyboardShouldPersistTaps = 'never',
  style = undefined,
  confirmButtonState = ConfirmButtonState.Normal,
  scrollViewTestID,
  contentContainerStyle,
  buttonContainerStyle,
  enableOnAndroid,
  enableAutomaticScroll,
  extraScrollHeight,
  showsVerticalScrollIndicator,
}) {
  const { colors } = useTheme();
  confirmText = confirmText || strings('action_view.confirm');
  cancelText = cancelText || strings('action_view.cancel');
  const styles = getStyles(colors);

  return (
    <View style={baseStyles.flexGrow}>
      <KeyboardAwareScrollView
        style={[baseStyles.flexGrow, style]}
        resetScrollToCoords={{ x: 0, y: 0 }}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        testID={scrollViewTestID}
        contentContainerStyle={contentContainerStyle}
        enableOnAndroid={enableOnAndroid}
        enableAutomaticScroll={enableAutomaticScroll}
        extraScrollHeight={extraScrollHeight}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator ?? true}
      >
        <TouchableWithoutFeedback
          style={baseStyles.flexGrow}
          // eslint-disable-next-line react/jsx-no-bind
          onPress={() => {
            if (keyboardShouldPersistTaps === 'handled') {
              Keyboard.dismiss();
            }
            onTouchablePress && onTouchablePress();
          }}
        >
          {children}
        </TouchableWithoutFeedback>

        <View style={[styles.actionContainer, buttonContainerStyle]}>
          {showCancelButton && (
            <Button
              onPress={onCancelPress}
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              label={cancelText}
              testID={cancelTestID}
              style={styles.button}
              isDisabled={confirmed}
            />
          )}
          {showConfirmButton && (
            <Button
              onPress={onConfirmPress}
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              label={confirmText}
              testID={confirmTestID}
              style={[
                styles.button,
                confirmButtonState === ConfirmButtonState.Warning &&
                  styles.confirmButtonWarning,
              ]}
              isDisabled={confirmed || confirmDisabled || loading}
              loading={confirmed || loading}
              isDanger={confirmButtonState === ConfirmButtonState.Error}
            />
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

ActionView.defaultProps = {
  cancelText: '',
  confirmButtonMode: 'normal',
  confirmText: '',
  confirmTestID: '',
  confirmed: false,
  cancelTestID: '',
  showCancelButton: true,
  showConfirmButton: true,
  contentContainerStyle: undefined,
};

ActionView.propTypes = {
  /**
   * TestID for the cancel button
   */
  cancelTestID: PropTypes.string,
  /**
   * TestID for the confirm button
   */
  confirmTestID: PropTypes.string,
  /**
   * Text to show in the cancel button
   */
  cancelText: PropTypes.string,
  /**
   * Content to display above the action buttons
   */
  children: PropTypes.node,
  /**
   * Type of button to show as the confirm button
   */
  confirmButtonMode: PropTypes.oneOf(['normal', 'confirm', 'sign']),
  /**
   * Text to show in the confirm button
   */
  confirmText: PropTypes.string,
  /**
   * Whether action view was confirmed in order to block any other interaction
   */
  confirmed: PropTypes.bool,
  /**
   * Whether action view confirm button should be disabled
   */
  confirmDisabled: PropTypes.bool,
  /**
   * Called when the cancel button is clicked
   */
  onCancelPress: PropTypes.func,
  /**
   * Called when the confirm button is clicked
   */
  onConfirmPress: PropTypes.func,
  /**
   * Called when the touchable without feedback is clicked
   */
  onTouchablePress: PropTypes.func,

  /**
   * Whether cancel button is shown
   */
  showCancelButton: PropTypes.bool,
  /**
   * Whether confirm button is shown
   */
  showConfirmButton: PropTypes.bool,
  /**
   * Loading after confirm
   */
  loading: PropTypes.bool,
  /**
   * Determines if the keyboard should stay visible after a tap
   */
  keyboardShouldPersistTaps: PropTypes.string,
  /**
   * Optional View styles. Applies to scroll view
   */
  style: PropTypes.object,
  /**
   * Optional Confirm button state - this can be Error/Warning/Normal.
   */
  confirmButtonState: PropTypes.string,

  /**
   * Optional TestID for the parent scroll View
   */
  scrollViewTestID: PropTypes.string,
  /**
   * Optional View styles. Applies to scroll view
   */
  contentContainerStyle: PropTypes.object,
  /**
   * Optional View styles. Applies to button container
   */
  buttonContainerStyle: PropTypes.object,
  /**
   * Enable on Android
   */
  enableOnAndroid: PropTypes.bool,
  /**
   * Enable automatic scroll
   */
  enableAutomaticScroll: PropTypes.bool,
  /**
   * Extra scroll height
   */
  extraScrollHeight: PropTypes.number,
  /**
   * Shows vertical scroll indicator
   */
  showsVerticalScrollIndicator: PropTypes.bool,
};
