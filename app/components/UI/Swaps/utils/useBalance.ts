import { useMemo } from 'react';
import { isSwapsNativeAsset, Token } from '.';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
  safeNumberToBN,
} from '../../../../util/number';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  AccountInformation,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import { BN } from 'ethereumjs-util';

type ContractBalances = TokenBalancesControllerState['contractBalances'];

// the return type of useBalance depends on the asUnits flag,
// but typescript cannot infer this without these additional overloads
function useBalance(
  accounts: { [address: string]: AccountInformation },
  balances: ContractBalances,
  selectedAddress: string | undefined,
  sourceToken: Token | undefined,
  opts?: { asUnits?: false },
): BN | null;

function useBalance(
  accounts: { [address: string]: AccountInformation },
  balances: ContractBalances,
  selectedAddress: string | undefined,
  sourceToken: Token | undefined,
  opts: { asUnits: true },
): string | null;

function useBalance(
  accounts: { [address: string]: AccountInformation },
  balances: ContractBalances,
  selectedAddress: string | undefined,
  sourceToken: Token | undefined,
  { asUnits = false }: { asUnits?: boolean } = {},
): BN | string | null {
  // TODO: This doesn't always return type BN. Objects down the line may attempt to call functions on the BN object.
  const balance = useMemo(() => {
    if (!sourceToken) {
      return null;
    }
    if (isSwapsNativeAsset(sourceToken)) {
      if (asUnits) {
        // Controller stores balances in hex for ETH
        return safeNumberToBN(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          accounts[selectedAddress!]?.balance || 0,
        );
      }
      return renderFromWei(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        accounts[selectedAddress!]?.balance,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tokenAddress = safeToChecksumAddress(sourceToken.address)!;

    if (tokenAddress in balances) {
      if (asUnits) {
        return balances[tokenAddress];
      }
      return renderFromTokenMinimalUnit(
        balances[tokenAddress],
        sourceToken.decimals,
      );
    }
    return safeNumberToBN(0);
  }, [accounts, asUnits, balances, selectedAddress, sourceToken]);

  return balance;
}

export default useBalance;
