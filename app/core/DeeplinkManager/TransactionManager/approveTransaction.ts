import { getNetworkTypeById } from '../../../util/networks';
import { generateApproveData } from '../../../util/transactions';
import { ParseOutput } from 'eth-url-parser';
import { strings } from '../../../../locales/i18n';
import { getAddress } from '../../../util/address';
import { addTransaction } from '../../../util/transaction-controller';
import DeeplinkManager from '../DeeplinkManager';
import Engine from '../../Engine';
import NotificationManager from '../../NotificationManager';
import { WalletDevice } from '@metamask/transaction-controller';

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
  const { PreferencesController, NetworkController } = Engine.context;

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
    chain_id as string,
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

  const txParams = {
    to: target_address.toString(),
    from: PreferencesController.state.selectedAddress.toString(),
    value: '0x0',
    data: generateApproveData({ spender: spenderAddress, value }),
  };

  addTransaction(txParams, {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    origin,
  });
}

export default approveTransaction;
