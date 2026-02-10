import React from 'react';
import { View } from 'react-native';
import { Hex } from '@metamask/utils';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import { useSDKV2Connection } from '../../../../../../hooks/useSDKV2Connection';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import { strings } from '../../../../../../../../locales/i18n';
import { useApprovalInfo } from '../../../../hooks/useApprovalInfo';
import { MMM_ORIGIN } from '../../../../constants/confirmations';
import InfoSection from '../../../UI/info-row/info-section';
import InfoRow from '../../../UI/info-row/info-row';
import Address from '../../../UI/info-row/info-value/address';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
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
  const sdkV2Connection = useSDKV2Connection(origin);
  const isMMDSDKV2Origin = Boolean(sdkV2Connection?.isV2);

  const isDappOrigin = origin !== MMM_ORIGIN;

  if (!transactionMetadata && !signatureRequest) {
    return null;
  }

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.NETWORK}>
      <NetworkRow chainId={chainId as Hex} />

      {isDappOrigin && (
        <AlertRow
          alertField={RowAlertKey.RequestFrom}
          label={strings('transactions.request_from')}
          style={styles.infoRowOverride}
        >
          <Text variant={TextVariant.BodyMD}>
            {isMMDSDKV2Origin ? sdkV2Connection?.origin : origin}
          </Text>
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
