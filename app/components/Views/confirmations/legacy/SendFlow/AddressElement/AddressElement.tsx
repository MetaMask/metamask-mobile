/* eslint-disable react/prop-types */

// Third-Party dependencies
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';

// External dependencies
import {
  renderShortAddress,
  getLabelTextByAddress,
} from '../../../../../../util/address';
import Identicon from '../../../../../UI/Identicon';
import { useTheme } from '../../../../../../util/theme';
import Text from '../../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { doENSReverseLookup } from '../../../../../../util/ENSUtils';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

// Internal dependecies
import styleSheet from './AddressElement.styles';
import { AddressElementProps } from './AddressElement.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { useSelector } from 'react-redux';

import { Hex } from '@metamask/utils';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../../../UI/AssetOverview/Balance/Balance';

const AddressElement: React.FC<AddressElementProps> = ({
  name,
  address,
  onAccountPress,
  onAccountLongPress,
  onIconPress,
  isAmbiguousAddress,
  chainId,
  displayNetworkBadge,
  ...props
}) => {
  const [displayName, setDisplayName] = useState(name);
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const allNetworks = useSelector(selectNetworkConfigurations);
  const addressElementNetwork = allNetworks[chainId];

  const shouldDisplayNetworkBadge = useMemo(
    () => displayNetworkBadge,
    [displayNetworkBadge],
  );

  const renderIdenticon = useCallback(() => {
    if (shouldDisplayNetworkBadge) {
      return (
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource(chainId as Hex)}
              name={addressElementNetwork?.name}
            />
          }
          badgePosition={BadgePosition.BottomRight}
        >
          <Identicon address={address} diameter={28} />
        </BadgeWrapper>
      );
    }
    return <Identicon address={address} diameter={28} />;
  }, [address, chainId, addressElementNetwork, shouldDisplayNetworkBadge]);

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
      <View style={styles.addressIdenticon}>{renderIdenticon()}</View>
      <View style={styles.addressElementInformation}>
        <View style={styles.accountNameLabel}>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.addressTextNickname}
            numberOfLines={1}
          >
            {primaryLabel}
          </Text>
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
        {accountTypeLabel && (
          <Text
            variant={TextVariant.BodySM}
            style={styles.accountNameLabelText}
          >
            {accountTypeLabel}
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
