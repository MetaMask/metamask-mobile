import { getDecimalChainId } from '../../../../../util/networks';
import {
  PostTradeBottomSheetParams,
  PostTradeStatus,
} from './PostTradeBottomSheet.types';

export type PostTradeAnalyticsStatus = 'in_progress' | 'complete' | 'failed';
export type PostTradeAnalyticsCta =
  | 'view_activity'
  | 'try_again'
  | 'trending_token';

export const getAnalyticsStatus = (
  status: PostTradeStatus,
): PostTradeAnalyticsStatus => {
  if (status === PostTradeStatus.Success) {
    return 'complete';
  }

  if (status === PostTradeStatus.Failed) {
    return 'failed';
  }

  return 'in_progress';
};

export const getPostTradeSharedAnalyticsProperties = ({
  sourceToken,
  destToken,
}: PostTradeBottomSheetParams) => ({
  swap_type:
    sourceToken?.chainId &&
    destToken?.chainId &&
    sourceToken.chainId !== destToken.chainId
      ? 'crosschain'
      : 'single_chain',
  chain_id_source: getDecimalChainId(sourceToken?.chainId),
  chain_id_destination: getDecimalChainId(destToken?.chainId),
  token_symbol_source: sourceToken?.symbol,
  token_symbol_destination: destToken?.symbol,
  token_address_source: sourceToken?.address,
  token_address_destination: destToken?.address,
});
