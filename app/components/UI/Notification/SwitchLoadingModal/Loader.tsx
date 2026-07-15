import React from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';

import Spinner from '../../AnimatedSpinner';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { ThemeColors } from '@metamask/design-tokens';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderWidth: 2,
      borderRadius: 16,
      paddingBottom: Device.isIphoneX() ? 24 : 18,
      minHeight: 120,
      margin: 16,
    },
    spinnerWrapper: {
      alignItems: 'center',
      marginVertical: 12,
    },
    text: {
      lineHeight: 20,
      paddingHorizontal: 24,
      marginVertical: 12,
      alignSelf: 'center',
    },
    button: {
      alignSelf: 'center',
      width: '90%',
    },
  });

const Loader = ({
  loadingText,
  onDismiss,
  errorText,
}: {
  loadingText: string;
  onDismiss: () => void;
  errorText?: string;
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const errorContent =
    errorText?.replace(/"/g, '') || loadingText.replace(/"/g, '');

  return (
    <View style={styles.root}>
      <View style={styles.spinnerWrapper}>
        {!errorText ? (
          <Spinner />
        ) : (
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.Error}
          />
        )}
      </View>
      <Text variant={TextVariant.BodyMD} style={styles.text}>
        {errorContent}
      </Text>
      {!!errorText && (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          onPress={onDismiss}
          style={styles.button}
        >
          {strings('app_settings.notifications_dismiss_modal')}
        </Button>
      )}
    </View>
  );
};

Loader.propTypes = {
  loadingText: PropTypes.string,
};

export default Loader;
