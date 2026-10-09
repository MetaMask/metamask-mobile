import { SignTypedDataVersion } from '@metamask/keyring-controller';
import Engine from '../../../../../core/Engine';
import type { SignedLimitOrderDelegation } from '../../api/limitOrders/create/schema';
import type { PreparedLimitOrderDelegation } from '../../api/limitOrders/getDelegations/schema';

/**
 * Signs the delegations from `GET /v2/limit-orders/delegations` with the
 * delegator's key, which is what authorises the order to be filled later.
 *
 * Only `delegation.signature` is replaced: the API verifies each signature
 * against exactly the delegation it issued, so everything else is passed
 * through untouched, `typedData` included. The payload signed is that same
 * `typedData`, rather than one rebuilt from the delegation struct, for the same
 * reason.
 *
 * Signing runs one delegation at a time so an order that needs both an
 * approval and a swap delegation goes through the keyring in the order the API
 * listed them.
 *
 * @param delegations - The prepared, unsigned delegations.
 * @returns The same delegations with the delegator's signature filled in.
 * @throws If any delegation cannot be signed, since a partially signed order
 * cannot be placed.
 */
export const signLimitOrderDelegations = async (
  delegations: PreparedLimitOrderDelegation[],
): Promise<SignedLimitOrderDelegation[]> => {
  const signedDelegations: SignedLimitOrderDelegation[] = [];

  for (const preparedDelegation of delegations) {
    const signature = await Engine.context.KeyringController.signTypedMessage(
      {
        from: preparedDelegation.delegation.delegator,
        data: preparedDelegation.typedData,
      },
      SignTypedDataVersion.V4,
    );

    signedDelegations.push({
      ...preparedDelegation,
      delegation: { ...preparedDelegation.delegation, signature },
    });
  }

  return signedDelegations;
};
