import { NameType } from '../../UI/Name/Name.types';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { useERC20Tokens } from './useERC20Tokens';
import { useAccountNames } from './useAccountNames';
import { useAccountWalletNames } from './useAccountWalletNames';
import { useSendFlowEnsResolutions } from '../../Views/confirmations/hooks/send/useSendFlowEnsResolutions';
import { useAddressTrustSignals } from '../../Views/confirmations/hooks/useAddressTrustSignals';
import { TrustSignalDisplayState } from '../../Views/confirmations/types/trustSignals';
import {
  getTrustSignalIcon,
  TrustSignalIcon,
} from '../../Views/confirmations/utils/trust-signals';

export { TrustSignalDisplayState } from '../../Views/confirmations/types/trustSignals';
export type { TrustSignalIcon } from '../../Views/confirmations/utils/trust-signals';

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
  /** @deprecated Use displayState instead */
  variant: DisplayNameVariant;
  displayState: TrustSignalDisplayState;
  icon: TrustSignalIcon | null;
  isAccount: boolean;
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
 * Priority: Malicious > Petname > Warning > Recognized > Verified > Unknown
 * Matches extension behavior.
 */
function getDisplayState(
  trustState: TrustSignalDisplayState | undefined,
  hasPetname: boolean,
  displayName: string | null,
): TrustSignalDisplayState {
  if (trustState === TrustSignalDisplayState.Malicious) {
    return TrustSignalDisplayState.Malicious;
  }

  if (hasPetname) {
    return TrustSignalDisplayState.Petname;
  }

  if (trustState === TrustSignalDisplayState.Warning) {
    return TrustSignalDisplayState.Warning;
  }

  if (displayName) {
    return TrustSignalDisplayState.Recognized;
  }

  if (trustState === TrustSignalDisplayState.Verified) {
    return TrustSignalDisplayState.Verified;
  }

  return TrustSignalDisplayState.Unknown;
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

  const trustSignalRequests = requests.map(({ value, variation }) => ({
    address: value,
    chainId: variation,
  }));
  const trustSignals = useAddressTrustSignals(trustSignalRequests);

  return requests.map(({ value, variation }, index) => {
    const watchedNftName = watchedNftNames[index];
    const firstPartyContractName = firstPartyContractNames[index];
    const erc20Token = erc20Tokens[index];
    const accountName = accountNames[index];
    const subtitle = accountWalletNames[index];
    const ensName = getResolvedENSName(variation, value);
    const trustSignal = trustSignals[index];

    let name =
      accountName ||
      ensName ||
      firstPartyContractName ||
      watchedNftName ||
      erc20Token?.name;

    const hasPetname = Boolean(accountName);

    const displayState = getDisplayState(
      trustSignal?.state,
      hasPetname,
      name || null,
    );

    // Applied after displayState to avoid the label triggering Recognized state
    if (!name && trustSignal?.label) {
      name = trustSignal.label;
    }

    const image = erc20Token?.image;

    const isFirstPartyContractName =
      firstPartyContractName !== undefined && firstPartyContractName !== null;

    const icon = getTrustSignalIcon(displayState);

    return {
      contractDisplayName: erc20Token?.name,
      image,
      isFirstPartyContractName,
      name,
      subtitle,
      variant: getVariant({ name, accountName }),
      displayState,
      icon,
      isAccount: Boolean(accountName),
    };
  });
}

export default useDisplayName;
