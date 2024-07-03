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
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 24 : 18,
      minHeight: 120,
    },
    spinnerWrapper: {
      alignItems: 'center',
      marginVertical: 12,
    },
    text: {
      lineHeight: 20,
      paddingHorizontal: 24,
      fontSize: 13,
      width: '100%',
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

  return (
    <View style={styles.root}>
      <View style={styles.spinnerWrapper}>
        {!errorText ? (
          <Spinner />
        ) : (
          <Icon
            name={IconName.Danger}
            size={IconSize.Lg}
            color={IconColor.Error}
          />
        )}
      </View>
      <Text variant={TextVariant.BodyMDMedium} style={styles.text}>
        {errorText || loadingText}
      </Text>
      {!!errorText && (
        <Button
          variant={ButtonVariants.Primary}
          label={strings('app_settings.notifications_dismiss_modal')}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={onDismiss}
        />
      )}
    </View>
  );
};

Loader.propTypes = {
  loadingText: PropTypes.string,
};

export default Loader;
