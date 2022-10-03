// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// External dependencies.
import Alert, { AlertType } from '../../Base/Alert';
import Text from '../../Base/Text';
import { useTheme } from '../../../../app/util/theme';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import { WarningAlertProps } from './WarningAlert.types';
import styleSheet from './WarningAlert.styles';

const WarningAlert = ({
  text,
  dismissAlert,
  onPressLearnMore,
  precedentAlert,
}: WarningAlertProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={[
        styles.alertContainer,
        precedentAlert && styles.upperAlertContainer,
      ]}
    >
      <Alert
        small
        type={AlertType.Warning}
        onDismiss={dismissAlert}
        style={styles.alertWrapper}
        renderIcon={() => (
          <MaterialCommunityIcon
            name="information"
            size={20}
            color={colors.warning.default}
            style={styles.alertIcon}
          />
        )}
      >
        <Text primary noMargin style={styles.alertText}>
          {text}
          {onPressLearnMore && (
            <Text primary noMargin link onPress={onPressLearnMore}>
              {' '}
              {strings('networks.learn_more')}
            </Text>
          )}
        </Text>
      </Alert>
    </View>
  );
};

export default WarningAlert;
