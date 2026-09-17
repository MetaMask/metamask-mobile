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
  selectKycSessionId,
  selectKycSessionStatus,
  selectKycSessionStatusMessage,
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

/** Temporary post-Sumsub screen that surfaces KycController session-status fields. */
const KycStatusPlaceholder = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const sessionStatus = useSelector(selectKycSessionStatus);
  const sessionId = useSelector(selectKycSessionId);
  const sessionStatusMessage = useSelector(selectKycSessionStatusMessage);

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
            label={strings('virtual_bank_account.kyc_status.session_status')}
            value={sessionStatus}
            testID={KycStatusPlaceholderSelectorsIDs.SESSION_STATUS}
          />
          <StatusRow
            label={strings('virtual_bank_account.kyc_status.session_id')}
            value={sessionId}
            testID={KycStatusPlaceholderSelectorsIDs.SESSION_ID}
          />
          <StatusRow
            label={strings(
              'virtual_bank_account.kyc_status.session_status_message',
            )}
            value={sessionStatusMessage}
            testID={KycStatusPlaceholderSelectorsIDs.SESSION_STATUS_MESSAGE}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default KycStatusPlaceholder;
