import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTransactionMetadataRequest } from '../../../../hooks/transactions/useTransactionMetadataRequest';
import AlertRow from '../../../UI/info-row/alert-row';
import { RowAlertKey } from '../../../UI/info-row/alert-row/constants';
import InfoSection from '../../../UI/info-row/info-section';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import Routes from '../../../../../../../constants/navigation/Routes';
import styleSheet from './advanced-details-row.styles';

const AdvancedDetailsRow = () => {
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();

  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled: false,
  });

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.FULL_SCREEN_CONFIRMATIONS.ADVANCED_DETAILS);
  }, [navigation]);

  if (!transactionMetadata) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      testID={ConfirmationRowComponentIDs.ADVANCED_DETAILS}
      activeOpacity={0.7}
    >
      <InfoSection>
        <AlertRow
          alertField={RowAlertKey.InteractingWith}
          label={strings('stake.advanced_details')}
          style={styles.infoRowOverride}
          withIcon={{
            color: IconColor.Muted,
            size: IconSize.Sm,
            name: IconName.ArrowRight,
          }}
        />
      </InfoSection>
    </TouchableOpacity>
  );
};

export function AdvancedDetailsRowSkeleton() {
  const { styles } = useStyles(styleSheet, {
    isNonceChangeDisabled: false,
  });

  return (
    <InfoSection>
      <View style={styles.skeletonContainer}>
        <Skeleton width={130} height={20} style={styles.skeletonBorderRadius} />
        <Skeleton width={16} height={16} style={styles.skeletonBorderRadius} />
      </View>
    </InfoSection>
  );
}

export default AdvancedDetailsRow;
