import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
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
import {
  SubjectPermissions,
  PermissionConstraint,
} from '@metamask/permission-controller';
import { RestrictedMethods } from '../../../../../core/Permissions/constants';
import { EndowmentPermissions } from '../../../../../constants/permissions';

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

  /**
   * Gets the name of the SLIP-44 protocol corresponding to the specified
   * `coin_type`.
   * Copy of coinTypeToProtocolName from extension
   * Source: https://github.com/MetaMask/metamask-extension/blob/49f8052b157374370ac71373708933c6e639944e/ui/helpers/utils/util.js#L524
   * @param { number} coinType - The SLIP-44 `coin_type` value whose name
   * to retrieve.
   * @returns {string | undefined} The name of the protocol if found.
   */
  const coinTypeToProtocolName = (coinType: number): string | undefined => {
    if (coinType === 1) {
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

  interface SnapPermissionData {
    label: string;
    date: number;
  }

  const handleRPCPermissionTitles = useCallback(
    (
      permissionsList: SubjectPermissions<PermissionConstraint>,
      key: typeof EndowmentPermissions['endowment:rpc'],
    ) => {
      const rpcPermissionsData: SnapPermissionData[] = [];
      const rpcPermissionsCaveats = permissionsList[key].caveats;
      const date = permissionsList[key].date;
      if (rpcPermissionsCaveats) {
        for (const caveat of rpcPermissionsCaveats) {
          const rpcPermissions = caveat.value as Record<string, boolean>;
          for (const rpcKey in rpcPermissions) {
            if (rpcPermissions[rpcKey] === true) {
              const title = strings(
                `app_settings.snaps.snap_permissions.human_readable_permission_titles.endowment:rpc.${rpcKey}`,
              );
              rpcPermissionsData.push({ label: title, date });
            }
          }
        }
      }
      return rpcPermissionsData;
    },
    [],
  );

  const handleBip44EntropyPermissionTitles = useCallback(
    (
      permissionsList: SubjectPermissions<PermissionConstraint>,
      key: typeof RestrictedMethods.snap_getBip44Entropy,
    ) => {
      const bip44EntropyData: SnapPermissionData[] = [];
      const coinTypeCaveats = permissionsList[key].caveats;
      const date = permissionsList[key].date;
      if (coinTypeCaveats) {
        for (const caveat of coinTypeCaveats) {
          const coinTypes = caveat.value as { coinType: number }[];
          for (const coinType of coinTypes) {
            const protocolName = coinTypeToProtocolName(coinType.coinType);
            if (protocolName) {
              const title = strings(
                'app_settings.snaps.snap_permissions.human_readable_permission_titles.snap_getBip44Entropy',
                { protocol: protocolName },
              );
              bip44EntropyData.push({ label: title, date });
            }
          }
        }
      }
      return bip44EntropyData;
    },
    [],
  );

  const isSnapsDerivationPath = (object: any): object is SnapsDerivationPath =>
    typeof object === 'object' &&
    object !== null &&
    'path' in object &&
    'curve' in object;

  const handleBip32PermissionTitles = useCallback(
    (
      permissionsList: SubjectPermissions<PermissionConstraint>,
      key:
        | typeof RestrictedMethods.snap_getBip32Entropy
        | typeof RestrictedMethods.snap_getBip32PublicKey,
    ) => {
      const bip32Data: SnapPermissionData[] = [];
      const permittedDerivationPaths = permissionsList[key].caveats?.[0].value;
      const date = permissionsList[key].date;
      if (permittedDerivationPaths && Array.isArray(permittedDerivationPaths)) {
        for (const permittedPath of permittedDerivationPaths) {
          if (isSnapsDerivationPath(permittedPath)) {
            const derivedProtocolName = getSnapDerivationPathName(
              permittedPath.path,
              permittedPath.curve,
            );
            const protocolName =
              derivedProtocolName ??
              `${permittedPath.path.join('/')} (${permittedPath.curve})`;

            const title = strings(
              `app_settings.snaps.snap_permissions.human_readable_permission_titles.${key}`,
              { protocol: protocolName },
            );
            bip32Data.push({ label: title, date });
          }
        }
      }
      return bip32Data;
    },
    [],
  );

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

  const derivePermissionsTitles: (
    permissionsList: SubjectPermissions<PermissionConstraint>,
  ) => SnapPermissionData[] = useCallback(
    (permissionsList: SubjectPermissions<PermissionConstraint>) => {
      const permissionsData: SnapPermissionData[] = [];

      for (const key in permissionsList) {
        const date = permissionsList[key].date;

        switch (key) {
          case EndowmentPermissions['endowment:rpc']: {
            permissionsData.push(
              ...handleRPCPermissionTitles(permissionsList, key),
            );
            break;
          }
          case RestrictedMethods.snap_getBip44Entropy: {
            permissionsData.push(
              ...handleBip44EntropyPermissionTitles(permissionsList, key),
            );
            break;
          }
          case RestrictedMethods.snap_getBip32Entropy:
          case RestrictedMethods.snap_getBip32PublicKey: {
            permissionsData.push(
              ...handleBip32PermissionTitles(permissionsList, key),
            );
            break;
          }
          default: {
            const title = strings(
              `app_settings.snaps.snap_permissions.human_readable_permission_titles.${key}`,
            );
            permissionsData.push({ label: title, date });
          }
        }
      }

      return permissionsData;
    },
    [
      handleBip32PermissionTitles,
      handleBip44EntropyPermissionTitles,
      handleRPCPermissionTitles,
    ],
  );

  const permissionsToRender: SnapPermissionData[] = useMemo(
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
        <SnapPermissionCell title={item.label} date={item.date} key={index} />
      ))}
    </View>
  );
};

export default React.memo(SnapPermissions);
