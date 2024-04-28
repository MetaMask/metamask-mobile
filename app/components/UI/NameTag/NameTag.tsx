/* eslint-disable react/prop-types */

import React from 'react';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { NameTagProperties } from './NameTag.types';
import { View } from 'react-native';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NameTag.styles';
import Identicon from '../Identicon';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { toChecksumAddress } from 'ethereumjs-util';

const NameTag: React.FC<NameTagProperties> = ({ address }) => {
  const displayName = useDisplayName(address);
  const { styles } = useStyles(styleSheet, {
    displayNameVariant: displayName.variant,
  });

  const labelText =
    displayName.variant === DisplayNameVariant.Unknown
      ? toChecksumAddress(address)
      : displayName.name;

  // If the display name is just the address, we want to ellipsize
  // the middle so that the end of the address is still visible.
  // For all other names we ellipsize the end.
  const ellipsizeMode =
    displayName.variant === DisplayNameVariant.Unknown ? 'middle' : 'tail';

  return (
    <View style={styles.base}>
      {displayName.variant === DisplayNameVariant.Unknown ? (
        <Icon name={IconName.Question} />
      ) : (
        <Identicon address={address} diameter={16} />
      )}
      <Text
        ellipsizeMode={ellipsizeMode}
        numberOfLines={1}
        style={styles.label}
        variant={TextVariant.BodyMD}
      >
        {labelText}
      </Text>
    </View>
  );
};

export default NameTag;
