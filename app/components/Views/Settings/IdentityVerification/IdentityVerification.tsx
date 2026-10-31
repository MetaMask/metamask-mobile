import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSize,
  Box,
  ButtonSemantic,
  ButtonSemanticSeverity,
  Card,
  ContentVariant,
  HeaderStandard,
  IconName,
  ListItem,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../../util/date';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { IdentityVerificationSelectorsIDs } from './IdentityVerification.testIds';
import { useIdentityDataShares } from './useIdentityDataShares';

/**
 * Display names for the relay's vendors. These are brand names, so they are
 * deliberately not translated.
 */
const VENDOR_LABELS: Record<string, string> = {
  moonpay: 'MoonPay',
  iron: 'Iron',
  kalshi: 'Kalshi',
  kraken: 'Kraken',
  mock: 'Mock',
};

/**
 * Settings screen listing each identity verification the customer has
 * completed, one row per provider the data was shared with.
 */
const IdentityVerification = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { shares } = useIdentityDataShares();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={IdentityVerificationSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('identity_verification.title')}
        onBack={handleBack}
        includesTopInset
        testID={IdentityVerificationSelectorsIDs.HEADER}
        backButtonProps={{ testID: CommonSelectorsIDs.BACK_ARROW_BUTTON }}
      />
      <ScrollView contentContainerStyle={tw.style('grow pb-4')}>
        {shares.length > 0 && (
          <Card
            twClassName="mx-4 mt-2"
            testID={IdentityVerificationSelectorsIDs.VERIFICATION_CARD}
          >
            {shares.map((share) => (
              <ListItem
                key={share.kycSessionId}
                variant={ContentVariant.TwoLines}
                avatar={
                  <AvatarIcon
                    iconName={IconName.Security}
                    size={AvatarIconSize.Md}
                  />
                }
                title={strings('identity_verification.verification_for', {
                  provider: VENDOR_LABELS[share.vendor] ?? share.vendor,
                })}
                description={formatTimestampToDateTime(
                  Date.parse(share.sharedAt),
                )}
                testID={`${IdentityVerificationSelectorsIDs.SHARE_ROW}-${share.vendor}`}
              />
            ))}
          </Card>
        )}

        <Box twClassName="grow justify-end px-4 pt-6">
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Danger}
            twClassName="w-full"
            testID={IdentityVerificationSelectorsIDs.DELETE_BUTTON}
          >
            {strings('identity_verification.delete_identity_data')}
          </ButtonSemantic>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default IdentityVerification;
