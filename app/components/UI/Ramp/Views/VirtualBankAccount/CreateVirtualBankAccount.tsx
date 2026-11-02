import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { isPositiveNumberOrZero } from '../../../Money/utils/number';
import MoonPayPoweredByLogo from '../../../../../images/moonpay-powered-by-logo.svg';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { MOONPAY_PRIVACY_POLICY_URL } from './constants';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import { useVbaArrivalTime } from './hooks/useVbaArrivalTime';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { buildVbaBaseProperties, trackVbaEvent } from './vbaAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  type VbaScreenContentState,
} from './vbaScreenPerformance';

const VENDOR_TERMS_SCREEN_NAME = 'vba_vendor_terms';

const trackVendorTerms = (
  status: 'viewed' | 'accepted' | 'failed',
  failureReason?: string,
) =>
  trackVbaEvent(MetaMetricsEvents.MONEY_VBA_VENDOR_TERMS_UPDATED, () => ({
    ...buildVbaBaseProperties({
      screenName: VENDOR_TERMS_SCREEN_NAME,
      failureReason,
    }),
    status,
  }));

const FeatureRow = ({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) => (
  <ListItem
    variant={ListItemVariant.TwoLines}
    avatar={
      <AvatarIcon iconName={icon} severity={AvatarIconSeverity.Neutral} />
    }
    title={title}
    description={description}
  />
);

interface CreateVirtualBankAccountProps {
  onSuccess: () => void | Promise<void>;
}

const CreateVirtualBankAccount = ({
  onSuccess,
}: CreateVirtualBankAccountProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const {
    disclaimers,
    isLoading,
    isAccepting,
    error: disclaimersError,
    acceptDisclaimers,
    retry,
  } = useKycDisclaimers();
  const { apyPercent } = useMoneyVaultApy();
  const { arrivalTimeframe } = useVbaArrivalTime();

  let vendorTermsContentState: VbaScreenContentState =
    VBA_SCREEN_CONTENT_STATE.EMPTY;
  if (disclaimersError) {
    vendorTermsContentState = VBA_SCREEN_CONTENT_STATE.ERROR;
  } else if (disclaimers?.length) {
    vendorTermsContentState = VBA_SCREEN_CONTENT_STATE.POPULATED;
  }

  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId: VBA_SCREEN_ID.VENDOR_TERMS,
    contentReady: !isLoading,
    contentState: vendorTermsContentState,
  });

  // The user can't agree to disclaimers they haven't been shown.
  const canAgreeAndContinue =
    !isLoading &&
    !isAccepting &&
    !isAdvancing &&
    !disclaimersError &&
    Boolean(disclaimers?.length);

  useEffect(() => {
    trackVendorTerms('viewed');
  }, []);

  // Only the load and empty-catalog failures leave the screen without usable
  // terms. A save failure keeps them on screen and is reported from the
  // handler as terms_submission_failed.
  useEffect(() => {
    if (disclaimersError && !disclaimers?.length) {
      trackVendorTerms('failed', 'terms_unavailable');
    }
  }, [disclaimersError, disclaimers]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAgreeAndContinue = useCallback(async () => {
    if (isAdvancing) {
      return;
    }

    setIsAdvancing(true);
    let didAdvance = false;
    try {
      // Persist vendor terms locally. Email creates the vendor session and
      // records these accepted ids before continuing.
      if (await acceptDisclaimers()) {
        trackVendorTerms('accepted');
        await onSuccess();
        didAdvance = true;
      } else {
        // The terms loaded but the accepted ids could not be stored.
        trackVendorTerms('failed', 'terms_submission_failed');
      }
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'vba-onboarding' },
        context: {
          name: 'CreateVirtualBankAccount',
          data: { step: 'agreeAndContinue' },
        },
      });
    } finally {
      // A successful advance unmounts this screen, so keep the button busy.
      if (!didAdvance) {
        setIsAdvancing(false);
      }
    }
  }, [acceptDisclaimers, isAdvancing, onSuccess]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow pb-6')}
        testID={CreateVirtualBankAccountSelectorsIDs.CONTAINER}
      >
        <TitleStandard
          title={strings(
            'virtual_bank_account.create_virtual_bank_account.title',
          )}
          bottomLabel={strings(
            'virtual_bank_account.create_virtual_bank_account.description',
          )}
          twClassName="px-4 pb-4"
        />

        <Box>
          <FeatureRow
            icon={IconName.MoneyBag}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_no_fees_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_no_fees_description',
            )}
          />
          <FeatureRow
            icon={IconName.Clock}
            title={
              arrivalTimeframe
                ? strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
                    { timeframe: arrivalTimeframe },
                  )
                : strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
                  )
            }
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_arrives_description',
            )}
          />
          <FeatureRow
            icon={IconName.Refresh}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_set_up_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_set_up_description',
            )}
          />
          <FeatureRow
            icon={IconName.TrendUp}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_earn_title',
            )}
            description={
              isPositiveNumberOrZero(apyPercent)
                ? strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_earn_description',
                    { percentage: apyPercent },
                  )
                : strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_earn_description_no_apy',
                  )
            }
          />
        </Box>
      </ScrollView>

      <Box twClassName="gap-4 px-4 pt-4 pb-2">
        {disclaimersError ? (
          <Box
            alignItems={BoxAlignItems.Center}
            testID={CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_ERROR}
          >
            <Text variant={TextVariant.BodyXs} color={TextColor.ErrorDefault}>
              {strings(
                'virtual_bank_account.create_virtual_bank_account.disclaimers_error',
              )}
            </Text>
            <TextButton
              variant={TextVariant.BodyXs}
              onPress={retry}
              testID={CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_RETRY}
            >
              {strings(
                'virtual_bank_account.create_virtual_bank_account.disclaimers_retry',
              )}
            </TextButton>
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={
              isLoading
                ? CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_LOADING
                : undefined
            }
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.agreement_prefix',
            )}
            {disclaimers?.length ? (
              <>
                {/* TRAM-4169: this URL ships with the app instead of coming from
                    the vendor catalog. It renders with the catalog documents and
                    waits for them, so loading and error states never show a
                    partial legal line. */}
                <TextButton
                  variant={TextVariant.BodyXs}
                  onPress={() => Linking.openURL(MOONPAY_PRIVACY_POLICY_URL)}
                  testID={
                    CreateVirtualBankAccountSelectorsIDs.MOONPAY_PRIVACY_POLICY_LINK
                  }
                >
                  {strings(
                    'virtual_bank_account.create_virtual_bank_account.moonpay_privacy_policy_link',
                  )}
                </TextButton>
                {disclaimers.map((disclaimer) => (
                  <React.Fragment key={disclaimer.id}>
                    {strings(
                      'virtual_bank_account.create_virtual_bank_account.agreement_separator',
                    )}
                    <TextButton
                      variant={TextVariant.BodyXs}
                      onPress={() => Linking.openURL(disclaimer.url)}
                      testID={`${CreateVirtualBankAccountSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
                    >
                      {/* A single document carries the MoonPay label
                          (TRAM-4169); with several, the vendor labels keep each
                          link distinguishable. */}
                      {disclaimers.length === 1
                        ? strings(
                            'virtual_bank_account.create_virtual_bank_account.moonpay_terms_link',
                          )
                        : disclaimer.display_name}
                    </TextButton>
                  </React.Fragment>
                ))}
                {strings(
                  'virtual_bank_account.create_virtual_bank_account.agreement_suffix',
                )}
              </>
            ) : null}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting || isAdvancing}
          // The loading state toggles whether Fabric flattens this row. If that
          // lands in the same commit that removes the screen, Android crashes
          // re-parenting the label ("The specified child already has a parent").
          contentWrapperProps={{ collapsable: false }}
          isDisabled={!canAgreeAndContinue}
          onPress={handleAgreeAndContinue}
          testID={
            CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON
          }
        >
          {strings('virtual_bank_account.create_virtual_bank_account.button')}
        </Button>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="h-10 justify-center gap-1 opacity-40"
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.powered_by',
            )}
          </Text>
          <MoonPayPoweredByLogo name="moonpay-powered-by-logo" />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default CreateVirtualBankAccount;
