import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import InfoRow from '../../../../UI/InfoRow';
import { InfoRowDivider } from '../../../../UI/InfoRow/Divider/Divider';
import InfoSection from '../../../../UI/InfoRow/InfoSection';
import InfoRowAddress from '../../../../UI/InfoRow/InfoValue/Address';
import DisplayURL from '../../../../UI/InfoRow/InfoValue/DisplayURL';
import {
  isRecognizedPermit,
  parseSignTypedDataFromSignatureRequest,
} from '../../../../../utils/signature';
import { useSignatureRequest } from '../../../../../hooks/useSignatureRequest';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import { View } from 'react-native';
import styleSheet from './InfoSectionOriginAndDetails.styles';
import { isValidAddress } from 'ethereumjs-util';

export const InfoSectionOriginAndDetails = () => {
  const { styles } = useStyles(styleSheet, {});

  // signatureRequest from SignatureController does not include the origin
  // so we need to use approvalRequest
  const { approvalRequest } = useApprovalRequest();
  const origin = approvalRequest?.origin as string;

  const signatureRequest = useSignatureRequest();
  const isPermit = isRecognizedPermit(signatureRequest);

  const parsedMessage =
    parseSignTypedDataFromSignatureRequest(signatureRequest);
  const spender = parsedMessage.message?.spender;
  const verifyingContract = parsedMessage.domain?.verifyingContract;

  if (!signatureRequest) {
    return null;
  }

  const chainId = signatureRequest.chainId;

  return (
    <InfoSection
      testID={ConfirmationPageSectionsSelectorIDs.ORIGIN_INFO_SECTION}
    >
      {isPermit && spender && (
        <>
          <InfoRow label={strings('confirm.label.spender')}>
            <InfoRowAddress address={spender} chainId={chainId} />
          </InfoRow>
          <View style={styles.dividerContainer}>
            <InfoRowDivider />
          </View>
        </>
      )}
      <InfoRow
        label={strings('confirm.label.request_from')}
        tooltip={strings('confirm.personal_sign_tooltip')}
      >
        <DisplayURL url={origin} />
      </InfoRow>
      {isValidAddress(verifyingContract) && (
          <InfoRow label={strings('confirm.label.interacting_with')}>
            <InfoRowAddress
              address={verifyingContract}
              chainId={chainId}
            />
          </InfoRow>
        )}
    </InfoSection>
  );
};
