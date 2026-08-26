import React from 'react';
import { ImageSourcePropType } from 'react-native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  toast,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { consumeSuppressedNetworkAddedToast } from '../../../util/networks/networkToastSuppression';

export const handleShowNetworkActiveToast = (
  isOnBridgeRoute: boolean,
  networkName: string,
  networkImage: ImageSourcePropType,
) => {
  if (!isOnBridgeRoute) {
    toast({
      title: `${networkName} ${strings('toast.now_active')}`,
      startAccessory: React.createElement(AvatarNetwork, {
        src: networkImage,
        size: AvatarNetworkSize.Md,
      }),
      showCloseButton: false,
    });
  }
};

export const shouldShowNetworkListToast = ({
  newNetworkChainId,
  hasDeletedNetwork,
}: {
  newNetworkChainId?: string;
  hasDeletedNetwork: boolean;
}) => {
  const shouldShowNetworkAddedToast =
    Boolean(newNetworkChainId) &&
    !consumeSuppressedNetworkAddedToast(newNetworkChainId);

  return shouldShowNetworkAddedToast || hasDeletedNetwork;
};
