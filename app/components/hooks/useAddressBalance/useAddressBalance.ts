import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import BN4 from 'bnjs4';

import Engine from '../../../core/Engine';
import { getTicker } from '../../../util/transactions';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { selectEvmTicker } from '../../../selectors/networkController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { Asset } from './useAddressBalance.types';

const useAddressBalance = (
  asset?: Asset,
  address?: string,
  dontWatchAsset?: boolean,
) => {
  const [addressBalance, setAddressBalance] = useState('0');

  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const ticker = useSelector(selectEvmTicker);

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

      if (!contractBalances[contractAddress] && !dontWatchAsset) {
        TokensController.addToken({
          address: contractAddress,
          symbol,
          decimals,
          image,
          name,
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
      if (!contractAddress) {
        return;
      }
      if (selectedAddress === address && contractBalances[contractAddress]) {
        fromAccBalance = `${renderFromTokenMinimalUnit(
          contractBalances[contractAddress]
            ? contractBalances[contractAddress]
            : '0',
          decimals,
        )} ${symbol}`;
        setAddressBalance(fromAccBalance);
      } else {
        (async () => {
          try {
            const { AssetsContractController } = Engine.context;
            fromAccBalance = await AssetsContractController.getERC20BalanceOf(
              contractAddress,
              address,
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
  }, [accounts, address, asset, contractBalances, selectedAddress, ticker]);
  return { addressBalance };
};

export default useAddressBalance;
