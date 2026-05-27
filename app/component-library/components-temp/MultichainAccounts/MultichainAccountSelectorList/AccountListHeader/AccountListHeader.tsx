import React, { memo } from 'react';
import { View } from 'react-native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { useStyles } from '../../../../hooks';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListHeaderProps } from './AccountListHeader.types';

const AccountListHeader = memo(
  ({ title, containerStyle }: AccountListHeaderProps) => {
    const { styles } = useStyles(createStyles, {});

    return (
      <View style={[styles.sectionHeader, containerStyle]}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          style={styles.sectionHeaderText}
        >
          {title}
        </Text>
      </View>
    );
  },
);

AccountListHeader.displayName = 'AccountListHeader';

export default AccountListHeader;
