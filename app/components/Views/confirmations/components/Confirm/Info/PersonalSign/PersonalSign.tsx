import React from 'react';
import { View } from 'react-native';
import { hexToText } from '@metamask/controller-utils';

import { sanitizeString } from '../../../../../../../util/string';
import { strings } from '../../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../../util/theme';
import useApprovalRequest from '../../../../hooks/useApprovalRequest';
import InfoSection from '../../../UI/InfoRow/InfoSection';
import InfoRow from '../../../UI/InfoRow';
import InfoURL from '../../../UI/InfoRow/InfoValue/InfoURL';
import createStyles from './style';

const PersonalSign = () => {
  const { approvalRequest } = useApprovalRequest();
  const { colors } = useTheme();

  const styles = createStyles(colors);

  if (!approvalRequest) {
    return null;
  }

  return (
    <View style={styles.titleContainer}>
      <InfoSection>
        <InfoRow label={strings('confirm.request_from')} tooltip="This site is asking for your signature">
          <InfoURL url={approvalRequest.origin} />
        </InfoRow>
      </InfoSection>
      <InfoSection>
        <InfoRow label="Message">
          <InfoURL
            url={sanitizeString(hexToText(approvalRequest.requestData?.data))}
          />
        </InfoRow>
      </InfoSection>
    </View>
  );
};

export default PersonalSign;
