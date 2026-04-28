/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BannerBase from '../../foundation/BannerBase';
import Icon from '../../../../Icons/Icon';

// Internal dependencies.
import styleSheet from './BannerAlert.styles';
import { BannerAlertProps } from './BannerAlert.types';
import {
  DEFAULT_BANNERALERT_SEVERITY,
  DEFAULT_BANNERALERT_ICONSIZE,
  ICONNAME_BY_BANNERALERTSEVERITY,
  BANNERALERT_TEST_ID,
} from './BannerAlert.constants';

/**
 * @deprecated Please update your code to use `BannerAlert` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BannerAlert/README.md}
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/MIGRATION.md#banneralert-component Migration docs}
 * @since @metamask/design-system-react-native@0.11.0
 */
const BannerAlert: React.FC<BannerAlertProps> = ({
  style,
  severity = DEFAULT_BANNERALERT_SEVERITY,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, severity });

  const severityIcon = (
    <Icon
      name={ICONNAME_BY_BANNERALERTSEVERITY[severity]}
      color={styles.severityIcon.color}
      size={DEFAULT_BANNERALERT_ICONSIZE}
    />
  );

  return (
    <BannerBase
      style={styles.base}
      startAccessory={severityIcon}
      testID={BANNERALERT_TEST_ID}
      {...props}
    />
  );
};

export default BannerAlert;
