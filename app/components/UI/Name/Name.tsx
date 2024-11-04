/* eslint-disable react/prop-types */
import React from 'react';
import { TextProps, View, Image } from 'react-native';

import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { renderShortAddress } from '../../../util/address';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import Identicon from '../Identicon';
import { NameProperties, NameType } from './Name.types';
import styleSheet from './Name.styles';

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
        {renderShortAddress(address, 5)}
      </NameLabel>
    </View>
  );
};

const Name: React.FC<NameProperties> = ({
  chainId,
  preferContractSymbol,
  type,
  value,
}) => {
  if (type !== NameType.EthereumAddress) {
    throw new Error('Unsupported NameType: ' + type);
  }
  const { image, name, variant } = useDisplayName(
    type,
    value,
    chainId,
    preferContractSymbol,
  );
  const { styles } = useStyles(styleSheet, {
    displayNameVariant: variant,
  });

  if (variant === DisplayNameVariant.Unknown) {
    return <UnknownEthereumAddress address={value} />;
  }

  return (
    <View style={styles.base}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <Identicon address={value} diameter={16} />
      )}
      <NameLabel displayNameVariant={variant} ellipsizeMode="tail">
        {name}
      </NameLabel>
    </View>
  );
};

export default Name;
