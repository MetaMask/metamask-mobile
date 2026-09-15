import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import {
  selectKycUserStatus,
  selectKycUserStatusErrorCode,
  selectKycUserStatusSumsubSessionId,
} from '../../../../../selectors/kycController';
import { KycStatusPlaceholderSelectorsIDs } from './KycStatusPlaceholder.testIds';

const formatKycStatusValue = (value: string | null): string =>
  value ?? strings('virtual_bank_account.kyc_status.null_value');

const StatusRow = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string | null;
  testID: string;
}) => (
  <Box flexDirection={BoxFlexDirection.Column} gap={1}>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyLg} testID={testID}>
      {formatKycStatusValue(value)}
    </Text>
  </Box>
);

/** Temporary post-Sumsub screen that surfaces KycController user-status fields. */
const KycStatusPlaceholder = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const userStatus = useSelector(selectKycUserStatus);
  const userStatusSumsubSessionId = useSelector(
    selectKycUserStatusSumsubSessionId,
  );
  const userStatusErrorCode = useSelector(selectKycUserStatusErrorCode);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={goBack}
        backButtonProps={{
          testID: KycStatusPlaceholderSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        paddingHorizontal={4}
        twClassName="flex-1"
        testID={KycStatusPlaceholderSelectorsIDs.CONTAINER}
      >
        <Box marginTop={2} gap={2}>
          <Text variant={TextVariant.HeadingLg}>
            {strings('virtual_bank_account.kyc_status.title')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('virtual_bank_account.kyc_status.description')}
          </Text>
        </Box>
        <Box marginTop={6} gap={4}>
          <StatusRow
            label={strings('virtual_bank_account.kyc_status.user_status')}
            value={userStatus}
            testID={KycStatusPlaceholderSelectorsIDs.USER_STATUS}
          />
          <StatusRow
            label={strings(
              'virtual_bank_account.kyc_status.user_status_sumsub_session_id',
            )}
            value={userStatusSumsubSessionId}
            testID={
              KycStatusPlaceholderSelectorsIDs.USER_STATUS_SUMSUB_SESSION_ID
            }
          />
          <StatusRow
            label={strings(
              'virtual_bank_account.kyc_status.user_status_error_code',
            )}
            value={userStatusErrorCode}
            testID={KycStatusPlaceholderSelectorsIDs.USER_STATUS_ERROR_CODE}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default KycStatusPlaceholder;
