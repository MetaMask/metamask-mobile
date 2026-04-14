import { useMutation, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

export const useUpdateAssetPriority = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      asset,
      allAssets,
    }: {
      asset: CardFundingAsset;
      allAssets: CardFundingAsset[];
    }) => Engine.context.CardController.updateAssetPriority(asset, allAssets),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['card', 'home'] }),
  });
};
