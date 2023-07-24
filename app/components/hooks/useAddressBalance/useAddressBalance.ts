import { ERC1155, ERC721 } from '@metamask/controller-utils';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../core/Engine';
import { getTicker } from '../../../util/transactions';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { selectTicker } from '../../../selectors/networkController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import { Asset } from './useAddressBalance.types';

const useAddressBalance = (asset: Asset, address?: string) => {
  const [addressBalance, setAddressBalance] = useState('0');

  const { accounts, contractBalances, selectedAddress } = useSelector(
    (state: any) => ({
      accounts: selectAccounts(state),
      contractBalances: selectContractBalances(state),
      selectedAddress: selectSelectedAddress(state),
    }),
  );
  const ticker = useSelector(selectTicker);

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
      const { TokensController } = Engine.context as any;
      if (!contractAddress || !decimals) {
        return;
      }
      if (!contractBalances[contractAddress]) {
        TokensController.addToken(
          contractAddress,
          symbol,
          decimals,
          image,
          name,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const setBalance = () => {
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
              fromAccBalance || '0',
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
