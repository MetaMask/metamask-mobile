/* eslint-disable react/prop-types */

// Third-Party dependencies
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';

// Exgernal dependencies
import { renderShortAddress } from '../../../../util/address';
import Identicon from '../../../UI/Identicon';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { selectNetwork } from '../../../../selectors/networkController';
import { doENSReverseLookup } from '../../../../util/ENSUtils';

// Internal dependecies
import styleSheet from './AddressElement.styles';
import { AddressElementProps } from './AddressElement.types';

const AddressElement: React.FC<AddressElementProps> = ({
  name,
  address,
  onAccountPress,
  onAccountLongPress,
  ...props
}) => {
  const [displayName, setDisplayName] = useState(name);
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const network = useSelector(selectNetwork);

  const fetchENSName = useCallback(async () => {
    if (!displayName) {
      const ensName = await doENSReverseLookup(address, network);
      setDisplayName(ensName);
    }
  }, [displayName, address, network]);

  useEffect(() => {
    fetchENSName();
  }, [fetchENSName]);

  const primaryLabel =
    displayName && !displayName.startsWith(' ')
      ? displayName
      : renderShortAddress(address);
  const secondaryLabel =
    displayName && !displayName.startsWith(' ') && renderShortAddress(address);

  return (
    <TouchableOpacity
      onPress={() => onAccountPress(address)}
      onLongPress={() => onAccountLongPress(address)}
      key={address}
      style={styles.addressElementWrapper}
      {...props}
    >
      <View style={styles.addressIdenticon}>
        <Identicon address={address} diameter={28} />
      </View>
      <View style={styles.addressElementInformation}>
        <Text
          variant={TextVariant.BodyMD}
          style={styles.addressTextNickname}
          numberOfLines={1}
        >
          {primaryLabel}
        </Text>
        {!!secondaryLabel && (
          <Text
            variant={TextVariant.BodyMD}
            style={styles.addressTextAddress}
            numberOfLines={1}
          >
            {secondaryLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default AddressElement;
