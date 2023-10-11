import { handleSignatureAction } from '../confirmation/signatureUtils';
import { getAddressAccountType } from '../address';
import { signModalNavDetail } from './hardwareWallets/ledger';
import { KeyringTypes } from '@metamask/keyring-controller';
import { KEYRING_LEDGER } from '../../../app/core/Ledger/Ledger';

const navMethodFactory = new Map<KeyringTypes, any>();
navMethodFactory.set(KEYRING_LEDGER, signModalNavDetail);

export default async (
  onReject: () => void,
  onConfirm: () => void,
  messageParams: any,
  signType: string,
) => {
  const addressType = getAddressAccountType(messageParams.from);

  const onConfirmationComplete = async (confirmed: boolean) => {
    if (!confirmed) {
      await handleSignatureAction(onReject, messageParams, signType, false);
    } else {
      await handleSignatureAction(onConfirm, messageParams, signType, true);
    }
  };

  const navPromise = navMethodFactory.get(addressType as KeyringTypes);

  if (navPromise === undefined) {
    //TODO: add error handling
    throw new Error(`No nav type for address type ${addressType}`);
  }

  return await navPromise({
    messageParams,
    onConfirmationComplete,
    type: signType,
  });
};
