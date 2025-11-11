import { JsonSnapsRegistry } from '@metamask/snaps-controllers';
import { ControllerInitFunction } from '../../types';
import { SnapsRegistryMessenger } from '../../messengers/snaps';

/**
 * Initialize the Snaps registry controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const snapsRegistryInit: ControllerInitFunction<
  JsonSnapsRegistry,
  SnapsRegistryMessenger
> = ({ controllerMessenger, persistedState }) => {
  const requireAllowlist = process.env.METAMASK_BUILD_TYPE === 'main';

  const controller = new JsonSnapsRegistry({
    // @ts-expect-error: `persistedState.SnapsRegistry` is not compatible
    // with the expected type.
    // TODO: Look into the type mismatch.
    state: persistedState.SnapsRegistry,
    messenger: controllerMessenger,
    refetchOnAllowlistMiss: requireAllowlist,

    url: {
      registry: 'https://acl.dev.execution.metamask.io/latest/registry.json',
      signature: 'https://acl.dev.execution.metamask.io/latest/signature.json',
    },
    publicKey:
      '0x036b933172302bb25ffa52efb3ca73d1c0b40ae159830126e79f420aeb48236128',
  });

  return {
    controller,
  };
};
