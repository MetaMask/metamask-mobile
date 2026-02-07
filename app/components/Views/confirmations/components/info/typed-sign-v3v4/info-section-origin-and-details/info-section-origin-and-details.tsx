import React from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks';
import { RootState } from '../../../../../../../reducers';
import InfoRow from '../../../UI/info-row';
import { InfoRowDivider } from '../../../UI/info-row/divider';
import InfoSection from '../../../UI/info-row/info-section';
import InfoRowAddress from '../../../UI/info-row/info-value/address';
import DisplayURL from '../../../UI/info-row/info-value/display-url';
import {
  isRecognizedPermit,
  parseAndNormalizeSignTypedDataFromSignatureRequest,
} from '../../../../utils/signature';
import { useSignatureRequest } from '../../../../hooks/signatures/useSignatureRequest';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import { View } from 'react-native';
import styleSheet from './info-section-origin-and-details.styles';
import { isValidAddress } from 'ethereumjs-util';
import { selectNetworkConfigurationByChainId } from '../../../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import AvatarNetwork from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';

export const InfoSectionOriginAndDetails = () => {
  const { styles } = useStyles(styleSheet, {});
  const { approvalRequest, pageMeta } = useApprovalRequest();
  const origin = approvalRequest?.origin as string;

  // Get the request source to determine if the origin is verifiable
  const requestSource = pageMeta?.analytics?.request_source as
    | string
    | undefined;

  const signatureRequest = useSignatureRequest();
  const isPermit = isRecognizedPermit(signatureRequest);

  const parsedData =
    parseAndNormalizeSignTypedDataFromSignatureRequest(signatureRequest);
  const spender = parsedData.message?.spender;
  const verifyingContract = parsedData.domain?.verifyingContract;
  const chainId = signatureRequest?.chainId as Hex;
  const networkConfiguration = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const networkImage = getNetworkImageSource({ chainId: chainId as Hex });

  if (!signatureRequest) {
    return null;
  }

  return (
    <InfoSection testID={ConfirmationRowComponentIDs.ORIGIN_INFO}>
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
        <DisplayURL url={origin} requestSource={requestSource} />
      </InfoRow>
      <InfoRow label={strings('transactions.network')}>
        <View style={styles.networkRowContainer}>
          {networkImage && (
            <AvatarNetwork
              size={AvatarSize.Xs}
              imageSource={networkImage}
              style={styles.avatarNetwork}
            />
          )}
          <Text variant={TextVariant.BodyMD}>{networkConfiguration?.name}</Text>
        </View>
      </InfoRow>
      {isValidAddress(verifyingContract) && (
        <InfoRow label={strings('confirm.label.interacting_with')}>
          <InfoRowAddress address={verifyingContract} chainId={chainId} />
        </InfoRow>
      )}
    </InfoSection>
  );
};
