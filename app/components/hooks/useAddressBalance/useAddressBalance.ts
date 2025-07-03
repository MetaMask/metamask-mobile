import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import BN4 from 'bnjs4';

import Engine from '../../../core/Engine';
import { getTicker } from '../../../util/transactions';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../util/number';
<<<<<<< HEAD
import { selectEvmTicker, selectNetworkConfigurationByChainId, selectSelectedNetworkClientId } from '../../../selectors/networkController';
import { selectAccounts, selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { Asset } from './useAddressBalance.types';
import { RootState } from '../../../reducers';
import { isPerDappSelectedNetworkEnabled } from '../../../util/networks';
import { safeToChecksumAddress, getTokenDetails } from '../../../util/address';
import {
  selectContractBalances,
  selectContractBalancesPerChainId,
} from '../../../selectors/tokenBalancesController';
import { useAsyncResult } from '../useAsyncResult';

export const ERC20_DEFAULT_DECIMALS = 18;
=======
import { safeToChecksumAddress } from '../../../util/address';
import {
  selectEvmTicker,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { Asset } from './useAddressBalance.types';
import { Hex } from '@metamask/utils';
>>>>>>> stable

const useAddressBalance = (
  asset?: Asset,
  address?: string,
  dontWatchAsset?: boolean,
  chainId?: string,
  networkClientId?: string,
) => {
  const [addressBalance, setAddressBalance] = useState('0');
  const { value: tokenDetails } = useAsyncResult(
    async () =>
      await getTokenDetails(
        asset?.address as string,
        address,
        undefined,
        networkClientId,
      ),
    [asset?.address, address, networkClientId],
  );

  let accounts = useSelector(selectAccounts);
  let ticker = useSelector(selectEvmTicker);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId as Hex),
  );
  const contractBalances = useSelector(selectContractBalances);
  const contractBalancesPerChainId = useSelector(
    selectContractBalancesPerChainId,
  );
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
<<<<<<< HEAD
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  if (isPerDappSelectedNetworkEnabled() && chainId) {
    // If chainId is provided, use the accounts and ticker for that chain
    accounts = accountsByChainId[chainId] ?? {};
    ticker = networkConfigurationByChainId?.nativeCurrency;
  }
=======
  const ticker = useSelector(selectEvmTicker);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
>>>>>>> stable

  useEffect(() => {
    if (asset && !asset.isETH && !asset.tokenId) {
      const {
        address: rawAddress,
        symbol = 'ERC20',
        decimals,
        image,
        name,
      } = asset;
      const contractAddress = safeToChecksumAddress(rawAddress);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { TokensController } = Engine.context as any;
      if (!contractAddress || !decimals) {
        return;
      }

      if (!contractBalances[contractAddress as Hex] && !dontWatchAsset) {
        TokensController.addToken({
          address: contractAddress,
          symbol,
          decimals,
          image,
          name,
          networkClientId: selectedNetworkClientId,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const setBalance = () => {
      if (!address) return;
      const parsedTicker = getTicker(ticker);
      const checksumAddress = safeToChecksumAddress(address);
      if (!checksumAddress) {
        return;
      }
      const fromAccBalance = `${renderFromWei(
        accounts[checksumAddress]?.balance,
      )} ${parsedTicker}`;
      setAddressBalance(fromAccBalance);
    };

    // on signature request, asset is undefined
    if (!address) {
      return;
    }
    let fromAccBalance;

    if (
      !asset ||
      asset.isETH ||
      asset.tokenId ||
      asset.standard === ERC721 ||
      asset.standard === ERC1155
    ) {
      setBalance();
    } else if (asset?.decimals !== undefined) {
      const { address: rawAddress, symbol = 'ERC20', decimals } = asset;
      const contractAddress = safeToChecksumAddress(rawAddress);
      const balance =
        contractBalancesPerChainId?.[chainId as Hex]?.[
          contractAddress as Hex
        ] || contractBalances[contractAddress as Hex];
      if (!contractAddress) {
        return;
      }
<<<<<<< HEAD
      if (balance) {
        fromAccBalance = `${renderFromTokenMinimalUnit(
          balance ?? '0',
          Number(tokenDetails?.decimals || decimals || ERC20_DEFAULT_DECIMALS),
        )} ${tokenDetails?.symbol ?? symbol}`;
=======
      const hexContractAddress = contractAddress as Hex;
      if (selectedAddress === address && contractBalances[hexContractAddress]) {
        fromAccBalance = `${renderFromTokenMinimalUnit(
          contractBalances[hexContractAddress]
            ? contractBalances[hexContractAddress]
            : '0',
          decimals,
        )} ${symbol}`;
>>>>>>> stable
        setAddressBalance(fromAccBalance);
      } else {
        (async () => {
          try {
            const { AssetsContractController } = Engine.context;
            fromAccBalance = await AssetsContractController.getERC20BalanceOf(
              contractAddress,
              address,
              networkClientId,
            );
            fromAccBalance = `${renderFromTokenMinimalUnit(
              // This is to work around incompatibility between bn.js v4/v5 - should be removed when migration to v5 is complete
              new BN4(fromAccBalance?.toString(10) || '0', 10),
              decimals,
            )} ${symbol}`;
            setAddressBalance(fromAccBalance);
          } catch (exp) {
            console.error(`Error in trying to fetch token balance - ${exp}`);
          }
        })();
      }
    }
  }, [
    accounts,
    address,
    asset,
    chainId,
    contractBalances,
    contractBalancesPerChainId,
    networkClientId,
    selectedAddress,
    ticker,
    tokenDetails?.decimals,
    tokenDetails?.symbol,
  ]);
  return { addressBalance };
};

export default useAddressBalance;
