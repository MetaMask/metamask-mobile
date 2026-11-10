import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { KycVendor } from '@metamask/kyc-controller';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import Engine from '../../../../../core/Engine';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';
import { useVendorDisclaimers } from '../../hooks/useVendorDisclaimers';
import { VendorTermsSelectorsIDs } from './VendorTerms.testIds';

/** A legal document the caller adds next to the vendor's own catalog. */
export interface VendorTermsDocument {
  id: string;
  label: string;
  url: string;
}

export type VendorTermsEvent =
  | { status: 'viewed' }
  | { status: 'accepted' }
  | {
      status: 'failed';
      reason: 'terms_unavailable' | 'terms_submission_failed';
    };

export interface VendorTermsProps {
  /** Vendor whose terms the user is agreeing to. */
  vendor: KycVendor;
  /**
   * Extra documents shown with the vendor's catalog, such as a partner's
   * privacy policy. They render only once the catalog has loaded.
   */
  additionalDocuments?: VendorTermsDocument[];
  /** Called once the acceptance is stored on the KYC controller. */
  onAccepted: () => void | Promise<void>;
  onBack: () => void;
  /** Lets the caller record its own analytics for this screen. */
  onEvent?: (event: VendorTermsEvent) => void;
}

/**
 * A vendor's terms and conditions, owned by KYC. Loads the vendor's catalog for
 * the user's country, stores the user's acceptance on the KYC controller (not
 * yet submitted), and reports back. The KYC flow submits the acceptance to the
 * vendor once a session exists.
 */
const VendorTerms = ({
  vendor,
  additionalDocuments = [],
  onAccepted,
  onBack,
  onEvent,
}: VendorTermsProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const hasEnsuredLocalUserSecretRef = useRef(false);
  const {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  } = useVendorDisclaimers(vendor);

  const contentState = error
    ? KYC_SCREEN_CONTENT_STATE.ERROR
    : disclaimers?.length
      ? KYC_SCREEN_CONTENT_STATE.POPULATED
      : KYC_SCREEN_CONTENT_STATE.EMPTY;

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.VENDOR_TERMS,
    contentReady: !isLoading,
    contentState,
  });

  useEffect(() => {
    onEvent?.({ status: 'viewed' });
    // Viewed once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-creates the UKYC local user secret once the catalog request settles,
  // so a later startSession does not pay for secret generation. A failure
  // does not block onboarding: startSession creates the secret if it is
  // still missing. Guarded so a retry cannot fire it again.
  useEffect(() => {
    if (isLoading || hasEnsuredLocalUserSecretRef.current) {
      return;
    }
    hasEnsuredLocalUserSecretRef.current = true;
    Engine.context.KycController.ensureLocalUserSecret().catch(
      (secretError: unknown) => {
        Logger.error(secretError as Error, {
          tags: { feature: 'kyc', provider: vendor },
          context: {
            name: 'VendorTerms',
            data: { step: 'ensureLocalUserSecret' },
          },
        });
      },
    );
  }, [isLoading, vendor]);

  useEffect(() => {
    if (error && !disclaimers?.length) {
      onEvent?.({ status: 'failed', reason: 'terms_unavailable' });
    }
  }, [disclaimers, error, onEvent]);

  const canAgree =
    !isLoading &&
    !isAccepting &&
    !isAdvancing &&
    !error &&
    Boolean(disclaimers?.length);

  const handleAgree = useCallback(async () => {
    if (isAdvancing) {
      return;
    }
    setIsAdvancing(true);
    let didAdvance = false;
    try {
      if (await acceptDisclaimers()) {
        onEvent?.({ status: 'accepted' });
        await onAccepted();
        didAdvance = true;
      } else {
        onEvent?.({ status: 'failed', reason: 'terms_submission_failed' });
      }
    } catch (agreeError) {
      Logger.error(agreeError as Error, {
        tags: { feature: 'kyc', provider: vendor },
        context: { name: 'VendorTerms', data: { step: 'agree' } },
      });
    } finally {
      // A successful advance unmounts this screen, so keep the button busy.
      if (!didAdvance) {
        setIsAdvancing(false);
      }
    }
  }, [acceptDisclaimers, isAdvancing, onAccepted, onEvent, vendor]);

  const documents: VendorTermsDocument[] = disclaimers?.length
    ? [
        ...additionalDocuments,
        ...disclaimers.map(({ id, display_name: label, url }) => ({
          id,
          label,
          url,
        })),
      ]
    : [];

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VendorTermsSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        onBack={onBack}
        backButtonProps={{ testID: VendorTermsSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('flex-grow pb-6')}>
        <TitleStandard
          title={strings('kyc_vendor_terms.title')}
          bottomLabel={strings('kyc_vendor_terms.description')}
          twClassName="px-4 pb-4"
        />
        {isLoading ? (
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="py-6"
            testID={VendorTermsSelectorsIDs.DISCLAIMERS_LOADING}
          >
            <ActivityIndicator />
          </Box>
        ) : null}
        {documents.map((document) => (
          <Box key={document.id} twClassName="px-4 py-2">
            <TextButton
              variant={TextVariant.BodyMd}
              onPress={() => Linking.openURL(document.url)}
              testID={`${VendorTermsSelectorsIDs.DOCUMENT_LINK}-${document.id}`}
            >
              {document.label}
            </TextButton>
          </Box>
        ))}
      </ScrollView>

      <Box twClassName="gap-4 px-4 pt-4 pb-2">
        {error ? (
          <Box
            alignItems={BoxAlignItems.Center}
            testID={VendorTermsSelectorsIDs.DISCLAIMERS_ERROR}
          >
            <Text variant={TextVariant.BodyXs} color={TextColor.ErrorDefault}>
              {strings('kyc_vendor_terms.error')}
            </Text>
            <TextButton
              variant={TextVariant.BodyXs}
              onPress={retry}
              testID={VendorTermsSelectorsIDs.DISCLAIMERS_RETRY}
            >
              {strings('kyc_vendor_terms.retry')}
            </TextButton>
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('kyc_vendor_terms.agreement')}
          </Text>
        )}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting || isAdvancing}
          // See CreateVirtualBankAccount: keeps Fabric from re-parenting the
          // label in the commit that removes the screen (Android crash).
          contentWrapperProps={{ collapsable: false }}
          isDisabled={!canAgree}
          onPress={handleAgree}
          testID={VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON}
        >
          {strings('kyc_vendor_terms.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VendorTerms;
