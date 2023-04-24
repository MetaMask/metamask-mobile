import { endowmentPermissionBuilders } from '@metamask/snaps-controllers';
import {
  restrictedMethodPermissionBuilders,
  selectHooks,
} from '@metamask/rpc-methods';

export const ExcludedSnapPermissions = new Set([]);
export const ExcludedSnapEndowments = new Set(['endowment:keyring']);

/**
 * @returns {Record<string, Record<string, unknown>>} All endowment permission
 * specifications.
 */
export const buildSnapEndowmentSpecifications = () =>
  Object.values(endowmentPermissionBuilders).reduce(
    (allSpecifications, { targetKey, specificationBuilder }) => {
      if (!ExcludedSnapEndowments.has(targetKey)) {
        allSpecifications[targetKey] = specificationBuilder();
      }
      return allSpecifications;
    },
    {},
  );

/**
 * @param {Record<string, Function>} hooks - The hooks for the Snap
 * restricted method implementations.
 */
export function buildSnapRestrictedMethodSpecifications(hooks: any) {
  return Object.values(restrictedMethodPermissionBuilders).reduce(
    (specifications, { targetKey, specificationBuilder, methodHooks }) => {
      if (!ExcludedSnapPermissions.has(targetKey)) {
        specifications[targetKey] = specificationBuilder({
          methodHooks: selectHooks(hooks, methodHooks),
        });
      }
      return specifications;
    },
    {},
  );
}
