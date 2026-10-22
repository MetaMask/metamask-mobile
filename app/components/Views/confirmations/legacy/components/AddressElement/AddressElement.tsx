/* eslint-disable react/prop-types */

// Third-Party dependencies
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';

// External dependencies
import {
  renderShortAddress,
  getLabelTextByAddress,
} from '../../../../../../util/address';
import { doENSReverseLookup } from '../../../../../../util/ENSUtils';

import {
  AvatarAccount,
  AvatarAccountSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  ButtonIcon,
  IconName,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

// Internal dependecies
import { AddressElementProps } from './AddressElement.types';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { getAvatarAccountVariant } from '../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
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

  const allNetworks = useSelector(selectNetworkConfigurations);
  const addressElementNetwork = allNetworks[chainId];
  const avatarAccountType = useSelector(selectAvatarAccountType);

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
          <AvatarAccount
            address={address}
            variant={getAvatarAccountVariant(avatarAccountType)}
            size={AvatarAccountSize.Md}
          />
        </BadgeWrapper>
      );
    }
    return (
      <AvatarAccount
        address={address}
        variant={getAvatarAccountVariant(avatarAccountType)}
        size={AvatarAccountSize.Md}
      />
    );
  }, [
    address,
    chainId,
    addressElementNetwork,
    shouldDisplayNetworkBadge,
    avatarAccountType,
  ]);

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
    <ListItem
      isInteractive
      onPress={() => onAccountPress(address)}
      onLongPress={() => onAccountLongPress(address)}
      key={address}
      avatar={renderIdenticon()}
      title={primaryLabel}
      titleProps={{ numberOfLines: 1 }}
      description={secondaryLabel}
      descriptionProps={{ numberOfLines: 1 }}
      descriptionEndAccessory={
        accountTypeLabel ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {accountTypeLabel}
          </Text>
        ) : undefined
      }
      endAccessory={
        isAmbiguousAddress ? (
          <ButtonIcon
            iconName={IconName.Danger}
            onPress={onIconPress}
            accessibilityLabel={strings(
              'duplicate_address.accessibility_label',
            )}
          />
        ) : undefined
      }
      {...props}
    />
  );
};

export default AddressElement;
