/* eslint-disable react/prop-types */

// Third-Party dependencies
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies
import {
  renderShortAddress,
  getLabelTextByAddress,
} from '../../../../../../util/address';
import Identicon from '../../../../../UI/Identicon';
import { doENSReverseLookup } from '../../../../../../util/ENSUtils';

import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

// Internal dependecies
import { AddressElementProps } from './AddressElement.types';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
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
  const tw = useTailwind();

  const allNetworks = useSelector(selectNetworkConfigurations);
  const addressElementNetwork = allNetworks[chainId];

  const shouldDisplayNetworkBadge = useMemo(
    () => displayNetworkBadge,
    [displayNetworkBadge],
  );

  const renderIdenticon = useCallback(() => {
    if (shouldDisplayNetworkBadge) {
      const networkImageSource = NetworkBadgeSource(chainId as Hex);

      return (
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            networkImageSource ? (
              <BadgeNetwork
                src={networkImageSource}
                name={addressElementNetwork?.name}
                testID="address-element-network-badge"
              />
            ) : null
          }
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
      style={tw.style('flex-row p-4')}
      {...props}
    >
      <Box twClassName="pr-4">{renderIdenticon()}</Box>
      <Box twClassName="flex-1 flex-col">
        <Box twClassName="flex-row items-center justify-start">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="flex-1"
            numberOfLines={1}
          >
            {primaryLabel}
          </Text>
        </Box>
        {!!secondaryLabel && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {secondaryLabel}
          </Text>
        )}
        {accountTypeLabel && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="self-start rounded-lg border border-default px-2"
          >
            {accountTypeLabel}
          </Text>
        )}
      </Box>
      {isAmbiguousAddress && (
        <ButtonIcon
          iconName={IconName.Danger}
          size={ButtonIconSize.Md}
          twClassName="self-start p-1"
          onPress={onIconPress}
          accessibilityLabel="Show ambiguous address information"
        />
      )}
    </TouchableOpacity>
  );
};

export default AddressElement;
