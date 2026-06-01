// Third party dependencies.
import React from 'react';

import Pressable from '../../../component-library/components-temp/Pressable';
// External dependencies.
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
// Internal dependencies.
import { WalletActionProps } from './AccountAction.types';
import styleSheet from './AccountAction.styles';
import Icon, {
  IconSize,
} from '../../../component-library/components/Icons/Icon';

const AccountAction = ({
  actionTitle,
  iconName,
  iconSize = IconSize.Md,
  style,
  disabled = false,
  ...props
}: WalletActionProps) => {
  const { styles } = useStyles(styleSheet, { style, disabled });
  return (
    <Pressable style={styles.base} disabled={disabled} {...props}>
      <Icon style={styles.icon} size={iconSize} name={iconName} />

      <Text variant={TextVariant.BodyLGMedium} style={styles.descriptionLabel}>
        {actionTitle}
      </Text>
    </Pressable>
  );
};

export default AccountAction;
