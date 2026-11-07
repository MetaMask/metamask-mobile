import { CaipChainId, CaipNamespace } from '@metamask/utils';

/**
 * NetworkConnectMultiSelector props.
 */
export interface NetworkConnectMultiSelectorProps {
  isLoading?: boolean;
  onSubmit: (selectedChainIds: CaipChainId[]) => void;
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  defaultSelectedChainIds: CaipChainId[];
  /**
   * Chain IDs requested by the dapp. Used with {@link requestedNamespaces}
   * to put in-scope networks first in the list.
   */
  requestedCaipChainIds?: CaipChainId[];
  /**
   * Namespaces requested by the dapp (e.g. eip155). When set, all mainnets
   * in these namespaces sort above out-of-scope networks.
   */
  requestedNamespaces?: CaipNamespace[];
}
