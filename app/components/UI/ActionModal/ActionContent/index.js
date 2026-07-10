import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { usePureBlack } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import { getElevatedSurfaceColor } from '../../../../util/theme/themeUtils';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

export const createStyles = (theme, isPureBlack = false) =>
  StyleSheet.create({
    viewWrapper: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 24,
    },
    // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
    // Drop getElevatedSurfaceColor, usePureBlack(), and the isPureBlack param.
    // Use: backgroundColor: theme.colors.background.default, borderWidth: 0
    viewContainer: {
      width: '100%',
      backgroundColor: getElevatedSurfaceColor(theme),
      borderRadius: 10,
      borderWidth: isPureBlack ? 1 : 0,
      borderColor: isPureBlack ? theme.colors.border.muted : undefined,
    },
    actionHorizontalContainer: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
    },
    actionVerticalContainer: {
      flexDirection: 'column',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    childrenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    button: {
      margin: 8,
    },
    buttonHorizontal: {
      flex: 1,
    },
  });

/**
 * View that renders the content of an action modal
 * The objective of this component is to reuse it in other places and not
 * only on ActionModal component
 */
export default function ActionContent({
  cancelTestID = '',
  confirmTestID = '',
  cancelText = strings('action_view.cancel'),
  children,
  confirmText = strings('action_view.confirm'),
  confirmDisabled = false,
  cancelButtonMode = 'neutral',
  cancelButtonDisabled = false,
  confirmButtonMode = 'warning',
  displayCancelButton = true,
  displayConfirmButton = true,
  onCancelPress,
  onConfirmPress,
  viewWrapperStyle = null,
  viewContainerStyle = null,
  actionContainerStyle,
  childrenContainerStyle = null,
  verticalButtons,
}) {
  const theme = useTheme();
  const isPureBlack = usePureBlack();
  const styles = createStyles(theme, isPureBlack);

  // Map legacy StyledButton modes to MMDS Button props
  const mapModeToProps = (mode, { isCancel } = { isCancel: false }) => {
    // Normalize mode string
    const normalized = String(mode || '').toLowerCase();

    // Link-style buttons
    if (
      normalized === 'transparent' ||
      normalized === 'transparent-blue' ||
      normalized === 'warning-empty' ||
      normalized === 'info'
    ) {
      return { variant: ButtonVariant.Link, isDanger: normalized.includes('warning') };
    }

    // Secondary for cancel or explicit neutral/secondary/cancel
    if (
      isCancel ||
      normalized === 'neutral' ||
      normalized === 'secondary' ||
      normalized === 'cancel' ||
      normalized === 'rounded-normal' ||
      normalized === 'normal'
    ) {
      return { variant: ButtonVariant.Secondary, isDanger: false };
    }

    // Primary destructive
    if (normalized === 'warning' || normalized === 'danger') {
      return { variant: ButtonVariant.Primary, isDanger: true };
    }

    // Default primary confirm
    // includes: 'confirm', 'blue', 'sign', 'inverse', etc.
    return { variant: ButtonVariant.Primary, isDanger: false };
  };

  return (
    <View style={[styles.viewWrapper, viewWrapperStyle]}>
      <View style={[styles.viewContainer, viewContainerStyle]}>
        <View style={[styles.childrenContainer, childrenContainerStyle]}>
          {children}
        </View>
        <View
          style={[
            verticalButtons
              ? styles.actionVerticalContainer
              : styles.actionHorizontalContainer,
            actionContainerStyle,
          ]}
        >
          {displayCancelButton && (() => {
            const { variant, isDanger } = mapModeToProps(cancelButtonMode, {
              isCancel: true,
            });
            return (
              <Button
                testID={cancelTestID}
                variant={variant}
                isDanger={isDanger}
                onPress={onCancelPress}
                isDisabled={cancelButtonDisabled}
                size={ButtonSize.Lg}
                style={[
                  styles.button,
                  !verticalButtons && styles.buttonHorizontal,
                ]}
              >
                {cancelText}
              </Button>
            );
          })()}
          {displayConfirmButton && (() => {
            const { variant, isDanger } = mapModeToProps(confirmButtonMode, {
              isCancel: false,
            });
            return (
              <Button
                testID={confirmTestID}
                variant={variant}
                isDanger={isDanger}
                onPress={onConfirmPress}
                isDisabled={confirmDisabled}
                size={ButtonSize.Lg}
                style={[
                  styles.button,
                  !verticalButtons && styles.buttonHorizontal,
                ]}
              >
                {confirmText}
              </Button>
            );
          })()}
        </View>
      </View>
    </View>
  );
}

ActionContent.propTypes = {
  cancelButtonDisabled: PropTypes.bool,
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
   * Type of button to show as the cancel button
   */
  cancelButtonMode: PropTypes.string,
  /**
   * Type of button to show as the confirm button
   */
  confirmButtonMode: PropTypes.string,
  /**
   * Whether confirm button is disabled
   */
  confirmDisabled: PropTypes.bool,
  /**
   * Text to show in the confirm button
   */
  confirmText: PropTypes.string,
  /**
   * Whether cancel button should be displayed
   */
  displayCancelButton: PropTypes.bool,
  /**
   * Whether confirm button should be displayed
   */
  displayConfirmButton: PropTypes.bool,
  /**
   * Called when the cancel button is clicked
   */
  onCancelPress: PropTypes.func,
  /**
   * Called when the confirm button is clicked
   */
  onConfirmPress: PropTypes.func,
  /**
   * View wrapper style
   */
  viewWrapperStyle: PropTypes.object,
  /**
   * View container style
   */
  viewContainerStyle: PropTypes.object,
  /**
   * Action container style
   */
  actionContainerStyle: PropTypes.object,
  /**
   * Whether buttons are rendered vertically
   */
  verticalButtons: PropTypes.bool,
  /**
   * Children container style
   */
  childrenContainerStyle: PropTypes.object,
};
