import React, { memo } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../components/Texts/Text';
import createStyles from '../MultichainAccountSelectorList.styles';
import { AccountListHeaderProps } from './AccountListHeader.types';

const AccountListHeader = memo(({ title }: AccountListHeaderProps) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <View style={styles.sectionHeader}>
      <Text
        variant={TextVariant.BodyMDBold}
        color={TextColor.Alternative}
        style={styles.sectionHeaderText}
      >
        {title}
      </Text>
    </View>
  );
});

AccountListHeader.displayName = 'AccountListHeader';

export default AccountListHeader;
