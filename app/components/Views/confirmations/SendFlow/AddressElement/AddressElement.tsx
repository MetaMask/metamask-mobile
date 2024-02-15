/* eslint-disable react/prop-types */

// Third-Party dependencies
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';

// Exgernal dependencies
import {
  renderShortAddress,
  getLabelTextByAddress,
} from '../../../../../util/address';
import Identicon from '../../../../UI/Identicon';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { selectChainId } from '../../../../../selectors/networkController';
import { doENSReverseLookup } from '../../../../../util/ENSUtils';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

// Internal dependecies
import styleSheet from './AddressElement.styles';
import { AddressElementProps } from './AddressElement.types';

const AddressElement: React.FC<AddressElementProps> = ({
  name,
  address,
  onAccountPress,
  onAccountLongPress,
  onIconPress,
  isAmbiguousAddress,
  ...props
}) => {
  const [displayName, setDisplayName] = useState(name);
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const chainId = useSelector(selectChainId);

  const fetchENSName = useCallback(async () => {
    if (!displayName) {
      const ensName = await doENSReverseLookup(address, chainId);
      setDisplayName(ensName);
    }
  }, [displayName, address, chainId]);

  useEffect(() => {
    fetchENSName();
  }, [fetchENSName]);

  const primaryLabel =
    displayName && !displayName.startsWith(' ')
      ? displayName
      : renderShortAddress(address);
  const secondaryLabel =
    displayName && !displayName.startsWith(' ') && renderShortAddress(address);
  const accountTypeLabel = getLabelTextByAddress(address);

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
        <View style={styles.accountNameLabel}>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.addressTextNickname}
            numberOfLines={1}
          >
            {primaryLabel}
          </Text>
          {accountTypeLabel && (
            <Text
              variant={TextVariant.BodySM}
              style={styles.accountNameLabelText}
            >
              {strings(accountTypeLabel)}
            </Text>
          )}
        </View>
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
      {isAmbiguousAddress && (
        <TouchableOpacity
          style={styles.warningIconWrapper}
          onPress={onIconPress}
        >
          <Icon
            name={IconName.Danger}
            size={IconSize.Lg}
            color={styles.warningIcon.color}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default AddressElement;
