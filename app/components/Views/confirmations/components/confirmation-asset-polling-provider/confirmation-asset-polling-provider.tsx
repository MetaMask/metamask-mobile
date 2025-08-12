import React from 'react';
import { Hex } from '@metamask/utils';
import { AssetPollingProvider } from '../../../../hooks/AssetPolling/AssetPollingProvider';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useSelector } from 'react-redux';

/**
 * ConfirmationAssetPollingProvider wraps children with asset polling functionality
 * when transaction metadata is available. This component enables automatic polling
 * of asset data (balances, prices, etc.) during confirmation flows.
 *
 * @component
 * @param props - The component props
 * @param props.children - React nodes to be rendered within the provider
 * @returns The children wrapped with AssetPollingProvider if transaction metadata exists, otherwise returns children directly without polling
 */
export const ConfirmationAssetPollingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const transactionMetaData = useTransactionMetadataRequest();

  const bridgeChainIds = useSelector(selectEnabledSourceChains).map(
    (chain) => chain.chainId as Hex,
  );

  if (!transactionMetaData) {
    return children;
  }

  return (
    <>
      <AssetPollingProvider
        chainIds={bridgeChainIds}
        networkClientId={transactionMetaData.networkClientId}
        address={transactionMetaData.txParams.from as Hex}
      />
      {children}
    </>
  );
};
