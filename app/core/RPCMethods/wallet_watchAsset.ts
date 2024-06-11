import Engine from '../Engine';

import { safeToChecksumAddress } from '../../util/address';
import { store } from '../../store';

import { getPermittedAccounts } from '../Permissions';
import { isSmartContractAddress } from '../../util/transactions';
import {
  TOKEN_NOT_SUPPORTED_FOR_NETWORK,
  TOKEN_NOT_VALID,
} from '../../constants/error';
import { selectChainId } from '../../selectors/networkController';
import { isValidAddress } from 'ethereumjs-util';
import { JsonRpcRequest, PendingJsonRpcResponse } from 'json-rpc-engine';

const wallet_watchAsset = async ({
  req,
  res,
  hostname,
  checkTabActive,
}: {
  req: JsonRpcRequest<{
    options: {
      address: string;
      decimals: string;
      symbol: string;
      image: string;
    };
    type: string;
  }>;
  res: PendingJsonRpcResponse<any>;
  hostname: string;
  checkTabActive: () => true | undefined;
}) => {
  const { AssetsContractController } = Engine.context;
  if (!req.params) {
    throw new Error('wallet_watchAsset params is undefined');
  }
  const {
    params: {
      options: { address, decimals, image, symbol },
      type,
    },
  } = req;

  const { TokensController } = Engine.context;
  const chainId = selectChainId(store.getState());
  console.log('starting wallet_watchAsset inside mobile');

  checkTabActive();

  const isValidTokenAddress = isValidAddress(address);

  if (!isValidTokenAddress) {
    throw new Error(TOKEN_NOT_VALID);
  }

  // Check if token exists on wallet's active network.
  const isTokenOnNetwork = await isSmartContractAddress(address, chainId);
  if (!isTokenOnNetwork) {
    throw new Error(TOKEN_NOT_SUPPORTED_FOR_NETWORK);
  }

  const permittedAccounts = await getPermittedAccounts(hostname);
  // This should return the current active account on the Dapp.
  const selectedAddress =
    Engine.context.PreferencesController.state.selectedAddress;

  // Fallback to wallet address if there is no connected account to Dapp.
  const interactingAddress = permittedAccounts?.[0] || selectedAddress;
  // This variables are to override the value of decimals and symbol from the dapp
  // if they are wrong accordingly to the token address
  // *This is an hotfix this logic should live on whatchAsset method on TokensController*
  let fetchedDecimals, fetchedSymbol;
  try {
    [fetchedDecimals, fetchedSymbol] = await Promise.all([
      AssetsContractController.getERC20TokenDecimals(address),
      AssetsContractController.getERC721AssetSymbol(address),
    ]);
    //The catch it's only to prevent the fetch from the chain to fail
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const finalTokenSymbol = fetchedSymbol ?? symbol;
  const finalTokenDecimals = fetchedDecimals ?? decimals;
  console.log('about to call watchAsset');

  try {
    await TokensController.watchAsset({
      asset: {
        address,
        symbol: finalTokenSymbol,
        // @ts-expect-error TODO: Fix decimal type
        decimals: finalTokenDecimals,
        image,
      },
      type,
      interactingAddress: safeToChecksumAddress(interactingAddress),
    });
  } catch (e) {
    console.error('error calling watchAsset', e);
  }
  console.log('watchAsset finished');

  res.result = true;
};

export default wallet_watchAsset;
