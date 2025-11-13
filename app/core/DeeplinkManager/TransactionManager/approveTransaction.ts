import { getNetworkTypeById } from '../../../util/networks';
import { generateApprovalData } from '../../../util/transactions';
import { ParseOutput } from 'eth-url-parser';
import { strings } from '../../../../locales/i18n';
import { getAddress } from '../../../util/address';
import { validateWithPPOM } from '../../../components/Views/confirmations/utils/deeplink';
import { addTransaction } from '../../../util/transaction-controller';
import DeeplinkManager from '../DeeplinkManager';
import Engine from '../../Engine';
import NotificationManager from '../../NotificationManager';
import { WalletDevice } from '@metamask/transaction-controller';
import { toChecksumHexAddress, toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

const toHexOrFallback = (value: string) => {
  try {
    return toHex(value);
  } catch {
    return value as Hex;
  }
};

async function approveTransaction({
  deeplinkManager,
  ethUrl,
  origin,
}: {
  deeplinkManager: DeeplinkManager;
  ethUrl: ParseOutput;
  origin: string;
}) {
  const { parameters, target_address, chain_id } = ethUrl;
  const { AccountsController, NetworkController } = Engine.context;

  if (chain_id) {
    const newNetworkType = getNetworkTypeById(chain_id);
    // @ts-expect-error TODO: Consolidate the network types used here with the controller-utils types
    NetworkController.setProviderType(newNetworkType);
  }

  const uint256Number = Number(parameters?.uint256);

  if (Number.isNaN(uint256Number))
    throw new Error('The parameter uint256 should be a number');
  if (!Number.isInteger(uint256Number))
    throw new Error('The parameter uint256 should be an integer');

  const value = uint256Number.toString(16);

  const spenderAddress = await getAddress(
    parameters?.address || '',
    (chain_id && toHexOrFallback(chain_id)) as string,
  );

  if (!spenderAddress) {
    NotificationManager.showSimpleNotification({
      status: 'simple_notification_rejected',
      duration: 5000,
      title: strings('transaction.invalid_recipient'),
      description: strings('transaction.invalid_recipient_description'),
    });
    deeplinkManager.navigation.navigate('WalletView');
  }

  const selectedAccount = AccountsController.getSelectedAccount();

  const txParams = {
    to: target_address.toString(),
    from: toChecksumHexAddress(selectedAccount.address),
    value: '0x0',
    data: generateApprovalData({ spender: spenderAddress, value }),
  };

  const chainId = toHexOrFallback(chain_id as string);
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);

  const securityAlertResponse = validateWithPPOM({
    txParams,
    origin,
    chainId,
    networkClientId,
  });

  addTransaction(txParams, {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    networkClientId,
    origin,
    securityAlertResponse,
  });
}

export default approveTransaction;
