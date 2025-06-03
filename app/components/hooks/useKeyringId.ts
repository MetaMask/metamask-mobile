import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectKeyrings } from '../../selectors/keyringController';
import { isMultichainWalletSnap } from '../../core/SnapKeyring/utils/snaps';
import { SnapId } from '@metamask/snaps-sdk';

export const useKeyringId = (account: InternalAccount) => {
  const keyrings = useSelector(selectKeyrings);
  const lowerCaseAddress = account.address.toLowerCase();
  const isFirstPartySnap =
    account.metadata.snap?.id &&
    isMultichainWalletSnap(account.metadata.snap.id as SnapId);

  if (isFirstPartySnap && account.options.entropySource) {
    return account.options.entropySource;
  }

  const keyringId = keyrings.find((keyring) =>
    keyring.accounts.some(
      (address) => address.toLowerCase() === lowerCaseAddress,
    ),
  )?.metadata.id;

  if (!keyringId) {
    throw new Error('[useKeyringId] - Keyring not found');
  }

  return keyringId;
};
