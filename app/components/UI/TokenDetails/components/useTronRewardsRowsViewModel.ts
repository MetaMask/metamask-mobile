import useTronAssetOverviewSection from './useTronAssetOverviewSection';
import type { TokenI } from '../../Tokens/types';

interface UseTronRewardsRowsViewModelArgs {
  token: Pick<TokenI, 'address' | 'chainId'>;
}

const useTronRewardsRowsViewModel = ({
  token,
}: UseTronRewardsRowsViewModelArgs) =>
  useTronAssetOverviewSection({
    enabled: true,
    tokenAddress: token.address,
    tokenChainId: token.chainId,
  });

export default useTronRewardsRowsViewModel;
