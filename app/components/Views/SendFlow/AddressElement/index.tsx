/* eslint-disable react/prop-types */
import React, { useEffect, useState, useCallback } from 'react';
import { renderShortAddress } from '../../../../util/address';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import Identicon from '../../../UI/Identicon';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { selectNetwork } from '../../../../selectors/networkController';
import { doENSReverseLookup } from '../../../../util/ENSUtils';

interface AddressElementProps extends TouchableOpacityProps {
  /**
   * Name to display
   */
  name?: string;
  /**
   * Ethereum address
   */
  address: string;
  /**
   * Callback on account press
   */
  onAccountPress: (address: string) => void;
  /**
   * Callback on account long press
   */
  onAccountLongPress: (address: string) => void;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    addressElementWrapper: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    addressElementInformation: {
      flex: 1,
      flexDirection: 'column',
    },
    addressIdenticon: {
      paddingRight: 16,
    },
    addressTextNickname: {
      flex: 1,
      color: colors.text.default,
    },
    addressTextAddress: {
      color: colors.text.alternative,
    },
  });

const AddressElement: React.FC<AddressElementProps> = ({
  name,
  address,
  onAccountPress,
  onAccountLongPress,
  ...props
}) => {
  const [displayName, setDisplayName] = useState(name);
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
    displayName && displayName[0] !== ' '
      ? displayName
      : renderShortAddress(address);
  const secondaryLabel =
    displayName && displayName[0] !== ' ' && renderShortAddress(address);

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
