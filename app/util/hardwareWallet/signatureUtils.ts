import { handleSignatureAction } from '../confirmation/signatureUtils';
import { getKeyringByAddress } from '../address';
import { signModalNavDetail } from './hardwareWallets/ledger';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navMethodFactory = new Map<ExtendedKeyringTypes, any>();
navMethodFactory.set(ExtendedKeyringTypes.ledger, signModalNavDetail);

export default async (
  onReject: () => void,
  onConfirm: () => void,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const navPromise = navMethodFactory.get(keyring.type as ExtendedKeyringTypes);

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
