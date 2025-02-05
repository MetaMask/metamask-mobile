import React from 'react';

import { ConfirmationPageSectionsSelectorIDs } from '../../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { strings } from '../../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../../component-library/hooks';
import InfoRow from '../../../../UI/InfoRow';
import { InfoRowDivider } from '../../../../UI/InfoRow/Divider/Divider';
import InfoSection from '../../../../UI/InfoRow/InfoSection';
import InfoRowAddress from '../../../../UI/InfoRow/InfoValue/Address';
import DisplayURL from '../../../../UI/InfoRow/InfoValue/DisplayURL';
import { isRecognizedPermit, parseTypedDataMessageFromSignatureRequest } from '../../../../../utils/signature';
import { useSignatureRequest } from '../../../../../hooks/useSignatureRequest';
import useApprovalRequest from '../../../../../hooks/useApprovalRequest';
import { View } from 'react-native';
import styleSheet from './InfoSectionAddressAndOrigin.styles';

export const InfoSectionAddressAndOrigin = () => {
  const { styles } = useStyles(styleSheet, {});

  // signatureRequest from SignatureController does not include the origin
  // so we need to use approvalRequest
  const { approvalRequest } = useApprovalRequest();
  const origin = approvalRequest?.origin as string;
  
  const signatureRequest = useSignatureRequest();
  const isPermit = isRecognizedPermit(signatureRequest);

  const {
    message: { spender } = {},
  } = parseTypedDataMessageFromSignatureRequest(signatureRequest) ?? {};

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
        label={strings('confirm.request_from')}
        tooltip={strings('confirm.personal_sign_tooltip')}
      >
        <DisplayURL url={origin} />
      </InfoRow>
    </InfoSection>
  );
};
