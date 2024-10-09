import React from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import ExpandableSection from '../../UI/ExpandableSection';
import AccountNetworkInfoCollapsed from './AccountNetworkInfoCollapsed';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';
import styleSheet from './AccountNetworkInfo.styles';

const AccountNetworkInfo = () => {
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  if (!approvalRequest) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ExpandableSection
        collapsedContent={<AccountNetworkInfoCollapsed />}
        expandedContent={<AccountNetworkInfoExpanded />}
        modalTitle={strings('confirm.details')}
      />
    </View>
  );
};

export default AccountNetworkInfo;
