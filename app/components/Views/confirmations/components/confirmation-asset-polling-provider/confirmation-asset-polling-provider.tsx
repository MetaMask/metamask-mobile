import React from 'react';
import { Hex } from '@metamask/utils';
import { AssetPollingProvider } from '../../../../hooks/AssetPolling/AssetPollingProvider';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';

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

  if (!transactionMetaData) {
    return children;
  }

  return (
    <>
      <AssetPollingProvider
        chainId={transactionMetaData.chainId}
        networkClientId={transactionMetaData.networkClientId}
        address={transactionMetaData.txParams.from as Hex}
      />
      {children}
    </>
  );
};
