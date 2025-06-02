import { ImageSourcePropType } from 'react-native';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import {
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { RestrictedMethods } from '../../../core/Permissions/constants';

/**
 * Enum to track states of the connect screen.
 */
export enum AccountConnectScreens {
  SingleConnect = 'SingleConnect',
  SingleConnectSelector = 'SingleConnectSelector',
  MultiConnectSelector = 'MultiConnectSelector',
  MultiConnectNetworkSelector = 'MultiConnectNetworkSelector',
}

export interface AccountConnectParams {
  hostInfo: {
    metadata: {
      origin: string;
      id: string;
      isEip1193Request?: boolean;
      promptToCreateSolanaAccount?: boolean;
    };
    permissions: {
      [Caip25EndowmentPermissionName]?: {
        parentCapability: string;
        caveats: [{ type: string; value: Caip25CaveatValue }] | null;
      };
      [RestrictedMethods.eth_accounts]?: {
        parentCapability: string;
      };
    };
  };
  permissionRequestId: string;
}

/**
 * AccountConnect props.
 */
export interface AccountConnectProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params: AccountConnectParams;
  };
}

export interface NetworkAvatarProps {
  size: AvatarSize;
  name: string;
  imageSource: ImageSourcePropType;
  variant: AvatarVariant;
}
