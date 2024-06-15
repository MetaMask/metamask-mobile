/* eslint-disable react/prop-types */

import React from 'react';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { NameProperties, NameType } from './Name.types';
import { TextProps, View } from 'react-native';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './Name.styles';
import Identicon from '../Identicon';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { toChecksumAddress } from 'ethereumjs-util';

const NameLabel: React.FC<{
  displayNameVariant: DisplayNameVariant;
  ellipsizeMode: TextProps['ellipsizeMode'];
}> = ({ displayNameVariant, ellipsizeMode, children }) => {
  const { styles } = useStyles(styleSheet, { displayNameVariant });
  return (
    <Text
      style={styles.label}
      ellipsizeMode={ellipsizeMode}
      numberOfLines={1}
      variant={TextVariant.BodyMD}
    >
      {children}
    </Text>
  );
};

const UnknownEthereumAddress: React.FC<{ address: string }> = ({ address }) => {
  const displayNameVariant = DisplayNameVariant.Unknown;
  const { styles } = useStyles(styleSheet, { displayNameVariant });
  return (
    <View style={styles.base}>
      <Icon name={IconName.Question} />
      <NameLabel displayNameVariant={displayNameVariant} ellipsizeMode="middle">
        {toChecksumAddress(address)}
      </NameLabel>
    </View>
  );
};

const Name: React.FC<NameProperties> = ({ type, value }) => {
  if (type !== NameType.EthereumAddress) {
    throw new Error('Unsupported NameType: ' + type);
  }
  const displayName = useDisplayName(type, value);
  const { styles } = useStyles(styleSheet, {
    displayNameVariant: displayName.variant,
  });

  if (displayName.variant === DisplayNameVariant.Unknown) {
    return <UnknownEthereumAddress address={value} />;
  }

  return (
    <View style={styles.base}>
      <Identicon address={value} diameter={16} />
      <NameLabel displayNameVariant={displayName.variant} ellipsizeMode="tail">
        {displayName.name}
      </NameLabel>
    </View>
  );
};

export default Name;
