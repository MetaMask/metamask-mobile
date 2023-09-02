import { handleSignatureAction as _handleSignatureAction } from '../confirmation/signatureUtils';
import Engine from '../../core/Engine';
import { getAddressAccountType } from '../address';
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
  const addressType = getAddressAccountType(messageParams.from);

  const { version, metamaskId: messageId } = messageParams;

  const { SignatureController } = Engine.context;

  const onConfirmationComplete = async (
    confirmed: boolean,
    rawSignature?: any,
  ) => {
    if (!confirmed) {
      await _handleSignatureAction(onReject, messageParams, signType, false);
      SignatureController.setDeferredSignError(messageId);
    } else {
      await _handleSignatureAction(onConfirm, messageParams, signType, true);
      SignatureController.setDeferredSignSuccess(messageId, rawSignature);
    }
  };

  const promiseMethod = navMethodFactory.get(addressType as KeyringTypes);

  if (promiseMethod === undefined) {
    //TODO: add error handling
    throw new Error(`No nav method for address type ${addressType}`);
  }

  return await promiseMethod({
    messageParams,
    onConfirmationComplete,
    type: signType,
    version,
  });
};
