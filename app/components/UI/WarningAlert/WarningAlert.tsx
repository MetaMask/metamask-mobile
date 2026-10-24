// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';

// External dependencies.
import Alert, { AlertType } from '../../Base/Alert';
import Text from '../../Base/Text';
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
          <Icon
            name={IconName.Info}
            size={IconSize.Md}
            color={IconColor.WarningDefault}
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
