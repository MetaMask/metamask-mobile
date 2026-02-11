import { NameType } from '../../UI/Name/Name.types';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { useERC20Tokens } from './useERC20Tokens';
import { useAccountNames } from './useAccountNames';
import { useAccountWalletNames } from './useAccountWalletNames';
import { useSendFlowEnsResolutions } from '../../Views/confirmations/hooks/send/useSendFlowEnsResolutions';

export interface UseDisplayNameRequest {
  preferContractSymbol?: boolean;
  type: NameType;
  value: string;
  variation: string;
}

export interface UseDisplayNameResponse {
  contractDisplayName?: string;
  image?: string;
  isFirstPartyContractName?: boolean;
  name?: string;
  subtitle?: string;
  variant: DisplayNameVariant;
}

/**
 * Indicate the source and nature of a display name for a given address.
 */
export enum DisplayNameVariant {
  /**
   * The display name was saved by the user for the given address.
   *
   * This indicates that the user has manually set a custom "petname"
   * for the address.
   */
  Saved = 'Saved',

  /**
   * The display name is provided by MetaMask for a known token or contract.
   *
   * MetaMask recognizes certain tokens and contracts and provides a default
   * display name for them.
   */
  Recognized = 'Recognized',

  /**
   * The address is not known to MetaMask and the user has not saved a custom
   * name.
   */
  Unknown = 'Unknown',
}

export type DisplayName =
  | { variant: DisplayNameVariant.Unknown }
  | {
      variant: DisplayNameVariant.Saved | DisplayNameVariant.Recognized;
      /**
       * The name to display.
       */
      name: string;
    };

function getVariant({
  name,
  accountName,
}: {
  name?: string;
  accountName?: string;
}) {
  if (accountName) {
    // Consider accountName as a saved name since NameController is not implemented yet
    return DisplayNameVariant.Saved;
  }

  if (name) {
    return DisplayNameVariant.Recognized;
  }

  return DisplayNameVariant.Unknown;
}

/**
 * Get the display name for the given value.
 *
 * @param type The NameType to get the display name for.
 * @param value The value to get the display name for.
 */
export function useDisplayName(
  request: UseDisplayNameRequest,
): UseDisplayNameResponse {
  return useDisplayNames([request])[0];
}

export function useDisplayNames(
  requests: UseDisplayNameRequest[],
): UseDisplayNameResponse[] {
  const firstPartyContractNames = useFirstPartyContractNames(requests);
  const watchedNftNames = useWatchedNFTNames(requests);
  const erc20Tokens = useERC20Tokens(requests);
  const accountNames = useAccountNames(requests);
  const accountWalletNames = useAccountWalletNames(requests);
  const { getResolvedENSName } = useSendFlowEnsResolutions();

  return requests.map(({ value, variation }, index) => {
    const watchedNftName = watchedNftNames[index];
    const firstPartyContractName = firstPartyContractNames[index];
    const erc20Token = erc20Tokens[index];
    const accountName = accountNames[index];
    const subtitle = accountWalletNames[index];
    const ensName = getResolvedENSName(variation, value);

    const name =
      accountName ||
      ensName ||
      firstPartyContractName ||
      watchedNftName ||
      erc20Token?.name;

    const image = erc20Token?.image;

    const isFirstPartyContractName =
      firstPartyContractName !== undefined && firstPartyContractName !== null;

    return {
      contractDisplayName: erc20Token?.name,
      image,
      isFirstPartyContractName,
      name,
      subtitle,
      variant: getVariant({ name, accountName }),
    };
  });
}

export default useDisplayName;
