import { createDeepEqualSelector } from '../util';
import { selectIsAssetsUnifyStateEnabled } from '../featureFlagController/assetsUnifyState';
import { AccountTrackerControllerState } from '@metamask/assets-controllers';
import { isEvmAccountType } from '@metamask/keyring-api';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  bigIntToHex,
  CaipAssetType,
  Hex,
  parseCaipAssetType,
} from '@metamask/utils';
import { decimalToPrefixedHex } from '../../util/conversions';
import { AssetsControllerState } from '@metamask/assets-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';

// ChainId (hex) -> AccountAddress (hex checksummed) -> Balance (hex)
export const getAccountTrackerControllerAccountsByChainId =
  createDeepEqualSelector(
    [
      selectIsAssetsUnifyStateEnabled,
      (state) => state.AccountTrackerController?.accountsByChainId ?? {},
      (state) => state.AssetsController?.assetsBalance ?? {},
      (state) => state.AssetsController?.assetsInfo ?? {},
      (state) => state.AccountsController?.internalAccounts?.accounts ?? {},
    ],
    (
      isAssetsUnifyStateEnabled: boolean,
      accountsByChainId: AccountTrackerControllerState['accountsByChainId'],
      assetsBalance: AssetsControllerState['assetsBalance'],
      assetsInfo: AssetsControllerState['assetsInfo'],
      internalAccountsById: AccountsControllerState['internalAccounts']['accounts'],
    ) => {
      if (!isAssetsUnifyStateEnabled) {
        return accountsByChainId;
      }

      const result: AccountTrackerControllerState['accountsByChainId'] = {};

      for (const [accountId, accountBalances] of Object.entries(
        assetsBalance,
      )) {
        const internalAccount = internalAccountsById[accountId];
        if (!internalAccount || !isEvmAccountType(internalAccount.type)) {
          continue;
        }

        const checksummedAddress = toChecksumHexAddress(
          internalAccount.address,
        );

        for (const [assetId, balanceData] of Object.entries(accountBalances)) {
          const metadata = assetsInfo[assetId];
          if (metadata?.type !== 'native') {
            continue;
          }

          const { chain: parsedChain } = parseCaipAssetType(
            assetId as CaipAssetType,
          );

          // No need to check if the chain is EVM, we already filtered out non-EVM accounts
          const hexChainId = decimalToPrefixedHex(parsedChain.reference);
          const amount = balanceData?.amount ?? '0';

          result[hexChainId] ??= {};
          result[hexChainId][checksummedAddress] = {
            // TODO: Use raw value from state when available
            balance: parseBalanceWithDecimals(amount, metadata.decimals),
          };
        }
      }

      return result;
    },
  );

function parseBalanceWithDecimals(
  balanceString: string,
  decimals: number,
): Hex {
  const [integerPart, fractionalPart = ''] = balanceString.split('.');

  if (decimals === 0) {
    return bigIntToHex(BigInt(integerPart));
  }

  if (fractionalPart.length >= decimals) {
    return bigIntToHex(
      BigInt(`${integerPart}${fractionalPart.slice(0, decimals)}`),
    );
  }

  return bigIntToHex(
    BigInt(
      `${integerPart}${fractionalPart}${'0'.repeat(
        decimals - fractionalPart.length,
      )}`,
    ),
  );
}
