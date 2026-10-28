import React, { useCallback } from 'react';
import { Image, ScrollView, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { KYC_STATUSES } from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../../util/date';
import { selectKycSessionStatus } from '../../../../selectors/kycController';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { IdentityVerificationSelectorsIDs } from './IdentityVerification.testIds';
import { useIdentityDataShares } from './useIdentityDataShares';
import moonPayIcon from './assets/moonpay-icon.png';

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

/** Vendor logos. A vendor with no logo falls back to a lettered avatar. */
const VENDOR_ICONS: Record<string, ImageSourcePropType> = {
  moonpay: moonPayIcon,
};

/**
 * The verification headline for a session's `finalStatus`. Anything that is
 * not a finished decision reads as in progress.
 *
 * @param finalStatus - The session's final status, or `null` when no session
 * has been fetched.
 * @returns The translated headline.
 */
const getStatusLabel = (finalStatus: string | null): string => {
  if (finalStatus === KYC_STATUSES.approved) {
    return strings('identity_verification.status_verified');
  }
  if (finalStatus === KYC_STATUSES.rejected) {
    return strings('identity_verification.status_not_verified');
  }
  return strings('identity_verification.status_in_progress');
};

/**
 * Settings screen showing the customer's identity-verification status and the
 * vendors their verified identity data has been shared with.
 */
const IdentityVerification = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const sessionStatus = useSelector(selectKycSessionStatus);
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
        <Card
          twClassName="mx-4 mt-2"
          testID={IdentityVerificationSelectorsIDs.STATUS_CARD}
        >
          <ListItem
            variant={ContentVariant.OneLine}
            avatar={
              <AvatarIcon
                iconName={IconName.Security}
                size={AvatarIconSize.Md}
              />
            }
            title={getStatusLabel(sessionStatus?.finalStatus ?? null)}
          />
        </Card>

        {shares.length > 0 && (
          <>
            <Text
              variant={TextVariant.HeadingMd}
              twClassName="px-4 pt-6 pb-1"
              testID={IdentityVerificationSelectorsIDs.SHARED_WITH_HEADING}
            >
              {strings('identity_verification.shared_with')}
            </Text>
            {shares.map((share) => {
              const vendorIcon = VENDOR_ICONS[share.vendor];
              const sharedOn = formatTimestampToDateTime(
                Date.parse(share.sharedAt),
              );
              return (
                <ListItem
                  key={share.kycSessionId}
                  variant={ContentVariant.TwoLines}
                  avatar={
                    vendorIcon ? (
                      <Image
                        source={vendorIcon}
                        style={tw.style('w-10 h-10 rounded-full')}
                        accessibilityIgnoresInvertColors
                      />
                    ) : undefined
                  }
                  title={VENDOR_LABELS[share.vendor] ?? share.vendor}
                  description={
                    sharedOn
                      ? strings('identity_verification.shared_on', {
                          date: sharedOn,
                        })
                      : undefined
                  }
                  testID={`${IdentityVerificationSelectorsIDs.SHARE_ROW}-${share.vendor}`}
                />
              );
            })}
          </>
        )}

        <Box twClassName="grow justify-end px-4 pt-6">
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Danger}
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
