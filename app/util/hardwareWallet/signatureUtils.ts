import { handleSignatureAction } from '../confirmation/signatureUtils';
import { getKeyringByAddress } from '../address';
import { signModalNavDetail } from './hardwareWallets/ledger';
import { KeyringTypes } from '@metamask/keyring-controller';

const navMethodFactory = new Map<KeyringTypes, any>();
navMethodFactory.set(KeyringTypes.ledger, signModalNavDetail);

export default async (
  onReject: () => void,
  onConfirm: () => void,
  messageParams: any,
  signType: string,
) => {
  const keyring = getKeyringByAddress(messageParams.from);

  const onConfirmationComplete = async (confirmed: boolean) => {
    if (!confirmed) {
      await handleSignatureAction(onReject, messageParams, signType, false);
    } else {
      await handleSignatureAction(onConfirm, messageParams, signType, true);
    }
  };

  if (!keyring) {
    throw new Error(`Keyring not found for address ${messageParams.from}`);
  }

  const navPromise = navMethodFactory.get(keyring.type as KeyringTypes);

  if (navPromise === undefined) {
    throw new Error(
      `Keyring type ${keyring.type} not supported for signature redirect navigation`,
    );
  }

  return await navPromise({
    messageParams,
    onConfirmationComplete,
    type: signType,
  });
};
