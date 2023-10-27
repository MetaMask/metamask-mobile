import { handleSignatureAction } from '../confirmation/signatureUtils';
import { getKeyringByAddress } from '../address';
import { signModalNavDetail } from './hardwareWallets/ledger';
import { HardwareDeviceNames } from '../../core/Ledger/Ledger';

const navMethodFactory = new Map<HardwareDeviceNames, any>();
navMethodFactory.set(HardwareDeviceNames.ledger, signModalNavDetail);

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
    //TODO: add error handling
    throw new Error(`Keyring not found for address ${messageParams.from}`);
  }

  const navPromise = navMethodFactory.get(keyring.type as HardwareDeviceNames);

  if (navPromise === undefined) {
    //TODO: add error handling
    throw new Error(`Keyring type ${keyring.type} not supported for signature redirect navigation`);
  }

  return await navPromise({
    messageParams,
    onConfirmationComplete,
    type: signType,
  });
};
