import { CaipChainId } from '@metamask/utils';

export interface AddressSelectorParams {
  /**
   * Optional callback that is called whenever an account is selected.
   */
  onSelectAddress?: (address: string) => void;
  /**
   * Optional boolean to indicate if privacy mode is disabled.
   */
  disablePrivacyMode?: boolean;
  /**
   * Optional array of CAIP chain IDs to display only specific networks.
   */
  displayOnlyCaipChainIds?: CaipChainId[];
  /**
   * Only show EVM accounts.
   */
  isEvmOnly?: boolean;
}
