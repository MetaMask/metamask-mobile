import { TokenSearchDiscoveryControllerMessenger } from '@metamask/token-search-discovery-controller/dist/token-search-discovery-controller.cjs';
import { TokenSearchDiscoveryControllerState } from '@metamask/token-search-discovery-controller';

export interface TokenSearchDiscoveryControllerParams {
  state?: Partial<TokenSearchDiscoveryControllerState>;
  messenger: TokenSearchDiscoveryControllerMessenger;
}
