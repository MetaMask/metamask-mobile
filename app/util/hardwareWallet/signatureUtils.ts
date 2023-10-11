import { handleSignatureAction } from '../confirmation/signatureUtils';
import { getAddressAccountType } from '../address';
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
  const addressType = getAddressAccountType(messageParams.from);

  const onConfirmationComplete = async (confirmed: boolean) => {
    if (!confirmed) {
      await handleSignatureAction(onReject, messageParams, signType, false);
    } else {
      await handleSignatureAction(onConfirm, messageParams, signType, true);
    }
  };

  const navPromise = navMethodFactory.get(addressType as HardwareDeviceNames);

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
