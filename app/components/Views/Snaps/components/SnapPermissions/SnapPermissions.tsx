import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { SnapPermissions as SnapPermissionsType } from '@metamask/snaps-utils';
import slip44 from '@metamask/slip44';
import type { SupportedCurve } from '@metamask/key-tree';
import stylesheet from './SnapPermissions.styles';
import { SNAP_PERMISSIONS } from '../../../../../constants/test-ids';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  SNAPS_DERIVATION_PATHS,
  SnapsDerivationPath,
  SnapsDerivationPathType,
} from '../../../../../constants/snaps';
import lodash from 'lodash';
import { useStyles } from '../../../../../component-library/hooks';
import { SnapPermissionCell } from '../SnapPermissionCell';
import { useSelector } from 'react-redux';

interface SnapPermissionsProps {
  snapId: string;
}

const SnapPermissions = ({ snapId }: SnapPermissionsProps) => {
  const { styles } = useStyles(stylesheet, {});

  const permissionsState = useSelector(
    (state: any) => state.engine.backgroundState.PermissionController,
  );

  function getPermissionSubjects(state: any) {
    return state.subjects || {};
  }

  function getPermissions(state: any, origin: any) {
    return getPermissionSubjects(state)[origin]?.permissions;
  }

  const permissionsFromController = getPermissions(permissionsState, snapId);

  console.log(
    'Snaps/ permissionsState: ',
    JSON.stringify(permissionsFromController),
  );

  /**
   * Gets the name of the SLIP-44 protocol corresponding to the specified
   * `coin_type`.
   * Copy of coinTypeToProtocolName from extension
   * Source: https://github.com/MetaMask/metamask-extension/blob/49f8052b157374370ac71373708933c6e639944e/ui/helpers/utils/util.js#L524
   * @param { number} coinType - The SLIP-44 `coin_type` value whose name
   * to retrieve.
   * @returns {string | undefined} The name of the protocol if found.
   */
  const coinTypeToProtocolName = (coinType: string): string | undefined => {
    if (coinType === '1') {
      return 'Test Networks';
    }
    return slip44[coinType]?.name;
  };

  /**
   * Copy of getSnapDerivationPathName from extension
   * source: https://github.com/MetaMask/metamask-extension/blob/49f8052b157374370ac71373708933c6e639944e/ui/helpers/utils/util.js#L548
   * @param {string[]} path
   * @param {string} curve
   * @returns {string | null}
   */
  const getSnapDerivationPathName = (
    path: SnapsDerivationPathType,
    curve: SupportedCurve,
  ) => {
    const pathMetadata = SNAPS_DERIVATION_PATHS.find(
      (derivationPath) =>
        derivationPath.curve === curve &&
        lodash.isEqual(derivationPath.path, path),
    );
    return pathMetadata?.name ?? null;
  };

  /**
   * Derives human-readable titles for the provided permissions list.
   * The derived titles are based on the permission key and specific permission scenarios.
   *
   * @param permissionsList - An object of permissions, where the key is the permission name and the value is the permission details.
   *
   * The function handles the following permission keys:
   * 1. 'endowment:rpc': RPC permissions are processed to find RPC methods that are set to true, and the corresponding titles are added.
   * 2. 'snap_getBip44Entropy': For each coin type in the permissions list, the corresponding protocol name is found and its title is added.
   * 3. 'snap_getBip32Entropy': For each BIP32 entropy permission in the permissions list, the corresponding protocol name or derivation path and curve are found and its title is added.
   * 4. 'snap_getBip32PublicKey': For each BIP32 public key permission in the permissions list, the corresponding protocol name or derivation path and curve are found and its title is added.
   *
   * For any other permission key, a default title is derived based on the permission key.
   *
   * @returns An array of strings, where each string is a human-readable title for a permission.
   */
  const derivePermissionsTitles = useCallback(
    (permissionsList: SnapPermissionsType) => {
      const rpcPermission = 'endowment:rpc';
      const getBip44EntropyPermission = 'snap_getBip44Entropy';
      const getBip32EntropyPermission = 'snap_getBip32Entropy';
      const getBip32PublicKeyPermission = 'snap_getBip32PublicKey';

      const permissionsStrings: string[] = [];

      for (const key in permissionsList) {
        if (key === rpcPermission) {
          const rpcPermissions = permissionsList[key] as {
            [key: string]: boolean | undefined;
          };
          for (const rpcKey in rpcPermissions) {
            if (rpcPermissions[rpcKey] === true) {
              const title = strings(
                `app_settings.snaps.snap_permissions.human_readable_permission_titles.endowment:rpc.${rpcKey}`,
              );
              permissionsStrings.push(title);
            }
          }
        } else if (key === getBip44EntropyPermission) {
          for (const coinType in permissionsList[key]) {
            const protocolName = coinTypeToProtocolName(coinType);
            if (protocolName) {
              const title = strings(
                'app_settings.snaps.snap_permissions.human_readable_permission_titles.snap_getBip44Entropy',
                { protocol: protocolName },
              );
              permissionsStrings.push(title);
            }
          }
        } else if (key === getBip32EntropyPermission && permissionsList[key]) {
          const bip32PermissionsArray = permissionsList[key];
          if (bip32PermissionsArray) {
            for (const bip32Permissions of bip32PermissionsArray) {
              const derivationPath = bip32Permissions as SnapsDerivationPath;
              const derivedProtocolName = getSnapDerivationPathName(
                derivationPath.path,
                bip32Permissions.curve,
              );
              const protocolName =
                derivedProtocolName ??
                `${derivationPath.path.join('/')} (${bip32Permissions.curve})`;
              const title = strings(
                'app_settings.snaps.snap_permissions.human_readable_permission_titles.snap_getBip32Entropy',
                { protocol: protocolName },
              );
              permissionsStrings.push(title);
            }
          }
        } else if (
          key === getBip32PublicKeyPermission &&
          permissionsList[key]
        ) {
          const bip32PermissionsArray = permissionsList[key];
          if (bip32PermissionsArray) {
            for (const bip32Permissions of bip32PermissionsArray) {
              const derivationPath = bip32Permissions as SnapsDerivationPath;
              const derivedProtocolName = getSnapDerivationPathName(
                derivationPath.path,
                bip32Permissions.curve,
              );
              const protocolName =
                derivedProtocolName ??
                `${derivationPath.path.join('/')} (${bip32Permissions.curve})`;
              const title = strings(
                'app_settings.snaps.snap_permissions.human_readable_permission_titles.snap_getBip32PublicKey',
                { protocol: protocolName },
              );
              permissionsStrings.push(title);
            }
          }
        } else {
          const title = strings(
            `app_settings.snaps.snap_permissions.human_readable_permission_titles.${key}`,
          );
          permissionsStrings.push(title);
        }
      }

      return permissionsStrings;
    },
    [],
  );

  const permissionsToRender: string[] = useMemo(
    () => derivePermissionsTitles(permissionsFromController),
    [derivePermissionsTitles, permissionsFromController],
  );

  return (
    <View testID={SNAP_PERMISSIONS} style={styles.section}>
      <Text variant={TextVariant.HeadingMD}>
        {strings(
          'app_settings.snaps.snap_permissions.permission_section_title',
        )}
      </Text>
      {permissionsToRender.map((item, index) => (
        <SnapPermissionCell title={item} date={1686005090788} key={index} />
      ))}
    </View>
  );
};

export default React.memo(SnapPermissions);
