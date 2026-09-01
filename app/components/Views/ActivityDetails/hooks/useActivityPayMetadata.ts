import { useSelector } from 'react-redux';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import {
  selectTransactionMetadataByHash,
  selectTransactionMetadataById,
} from '../../../../selectors/transactionController';
import {
  getLocalTransactionMetaId,
  type ActivityListItem,
} from '../../../../util/activity-adapters';

export function useActivityPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  const metaId = getLocalTransactionMetaId(item);
  const { hash, chainId } = item;

  return useSelector((state: RootState) => {
    const meta = metaId
      ? selectTransactionMetadataById(state, metaId)
      : selectTransactionMetadataByHash(state, hash);
    return meta && toEvmCaipChainId(meta.chainId) === chainId
      ? meta.metamaskPay
      : undefined;
  });
}
