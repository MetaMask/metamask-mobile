import React from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { strings } from '../../../../../../../../locales/i18n';
import { useApprovalInfo } from '../../../../hooks/useApprovalInfo';
import { MMM_ORIGIN } from '../../../../constants/confirmations';
import {
  isExternalAppOrigin,
  isExternalAppRequestSource,
} from '../../../../utils/origin';
import InfoSection from '../../../UI/info-row/info-section';
import InfoRow from '../../../UI/info-row/info-row';
import Address from '../../../UI/info-row/info-value/address';
import { Skeleton } from '../../../../../../../component-library/components-temp/Skeleton';
import NetworkRow from '../network-row';
import styleSheet from './network-and-origin-row.styles';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import AlertRow from '../../../UI/info-row/alert-row';

export const NetworkAndOriginRow = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const signatureRequest = useSignatureRequest();
  const { fromAddress, isSIWEMessage } = useApprovalInfo() ?? {};
  const chainId = transactionMetadata?.chainId || signatureRequest?.chainId;
  const origin =
    transactionMetadata?.origin || signatureRequest?.messageParams?.origin;

  // `request_source` is the transport the request arrived on. It is only
  // populated on signature requests; transactions persist only `origin`.
  const requestSource = (
    signatureRequest?.messageParams as
      | { meta?: { analytics?: { request_source?: string } } }
      | undefined
  )?.meta?.analytics?.request_source;

  const isDappOrigin = origin !== MMM_ORIGIN;

  if (!transactionMetadata && !signatureRequest) {
    return null;
  }

  // For requests where we cannot verify the dapp's identity, display a generic
  // "External app" label rather than the raw origin. This covers `ethereum:`
  // deeplinks / scanned QR codes (origin === 'deeplink' / 'qr-code'), MetaMask
  // SDK and MetaMask Connect (MWP) connections (origin is a bare connection
  // UUID), and any remote transport whose origin is self-reported and therefore
  // unverifiable (SDK v1, MWP, WalletConnect) as identified by `request_source`.
  const isExternalApp =
    isExternalAppOrigin(origin) || isExternalAppRequestSource(requestSource);
  const displayedOrigin = isExternalApp
    ? strings('confirm.label.external_app')
    : origin;

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.NETWORK}>
      <NetworkRow chainId={chainId as Hex} style={styles.infoRowOverride} />

      {isDappOrigin && (
        <AlertRow
          alertField={RowAlertKey.RequestFrom}
          label={strings('transactions.request_from')}
          style={styles.infoRowOverride}
        >
          <Text variant={TextVariant.BodyMD}>{displayedOrigin}</Text>
        </AlertRow>
      )}
      {signatureRequest && isSIWEMessage && (
        <InfoRow
          label={strings('confirm.label.signing_in_with')}
          testID={ConfirmationRowComponentIDs.SIWE_SIGNING_ACCOUNT_INFO}
        >
          <Address address={fromAddress ?? ''} chainId={chainId ?? ''} />
        </InfoRow>
      )}
    </InfoSection>
  );
};

export function NetworkAndOriginRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <InfoSection>
      <View style={styles.skeletonContainer}>
        <Skeleton width={70} height={20} style={styles.skeletonBorderRadius} />
        <Skeleton width={100} height={20} style={styles.skeletonBorderRadius} />
      </View>
    </InfoSection>
  );
}
