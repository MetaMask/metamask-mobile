// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import VerifyIdentity from '../../Views/SumSub/VerifyIdentity';
import PartnerTerms from '../../Views/SumSub/PartnerTerms';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import CreateVirtualBankAccount from '../../../Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount';
import { getKalshiPrototypeKycService } from './prototypeRuntime';
import { GEORGE_COPY, PROTOTYPE_COPY } from './prototypeConstants';
import { KalshiPrototypeTermsSelectorsIDs } from './KalshiPrototypeTerms.testIds';
import KalshiPrototypeLoading from './KalshiPrototypeLoading';

type TermsPage = 'consent' | 'partners' | 'vendor';

interface KalshiPrototypeTermsProps {
  /** Whether the idOS and SumSub consent pages are still to be accepted. */
  hasIdentityPages: boolean;
  /** The Kalshi documents the vendor page links. */
  vendorDisclaimers: KycDisclaimer[];
  /**
   * The vendor page's terms were accepted. Answers `true` when the
   * acceptance recorded, matching the reused view's own action.
   */
  onAccepted: () => Promise<boolean> | boolean;
  /** Leaves the terms. */
  onExit: () => void;
}

/**
 * The terms sequence, reusing the VBA consent and partner-terms views as they
 * are: `VerifyIdentity` (the consent screen) hands its catalog to
 * `PartnerTerms` (the idOS / verification partners page with the
 * scroll-to-agree behaviour), and the vendor page is VBA's vendor-terms view
 * carrying Kalshi content. A returning user who already consented sees the
 * vendor page alone.
 *
 * @param props - The pages to show and the acceptance handler.
 * @returns The terms sequence.
 */
const KalshiPrototypeTerms = ({
  hasIdentityPages,
  vendorDisclaimers,
  onAccepted,
  onExit,
}: KalshiPrototypeTermsProps) => {
  const [page, setPage] = useState<TermsPage>(
    hasIdentityPages ? 'consent' : 'vendor',
  );
  const [partnerLinks, setPartnerLinks] = useState<KycCatalogDisclaimerLink[]>(
    [],
  );

  const handleConsentContinue = useCallback(
    (disclaimers: KycCatalogDisclaimerLink[]) => {
      setPartnerLinks(disclaimers);
      setPage('partners');
    },
    [],
  );

  if (hasIdentityPages && page === 'consent') {
    return (
      <VerifyIdentity onContinue={handleConsentContinue} onExit={onExit} />
    );
  }

  if (hasIdentityPages && page === 'partners') {
    return (
      <PartnerTerms
        disclaimers={partnerLinks}
        onAgree={() => setPage('vendor')}
        onBack={() => setPage('consent')}
      />
    );
  }

  const agreement = (
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {`${PROTOTYPE_COPY.vendorTerms.prefix} `}
      {vendorDisclaimers.map((disclaimer, index) => (
        <React.Fragment key={disclaimer.id}>
          {index > 0 ? ' ' : null}
          <TextButton
            variant={TextVariant.BodyXs}
            onPress={() => Linking.openURL(disclaimer.url)}
          >
            {disclaimer.display_name}
          </TextButton>
        </React.Fragment>
      ))}
    </Text>
  );

  return (
    <Box testID={KalshiPrototypeTermsSelectorsIDs.VENDOR_PAGE}>
      <CreateVirtualBankAccount
        partnerContent={{
          title: GEORGE_COPY.kalshiTerms.title,
          description: GEORGE_COPY.kalshiTerms.body,
          disclaimers: vendorDisclaimers,
          onAgree: onAccepted,
          agreement,
          ctaLabel: GEORGE_COPY.kalshiTerms.accept,
        }}
        onSuccess={() => undefined}
      />
    </Box>
  );
};

/**
 * Loads the terms data the sequence needs from the fake, holding the shared
 * fox loader until it lands.
 *
 * @param props - The acceptance and exit handlers.
 * @returns The terms sequence, or the loader.
 */
const KalshiPrototypeTermsFlow = (
  props: Omit<
    KalshiPrototypeTermsProps,
    'hasIdentityPages' | 'vendorDisclaimers'
  >,
) => {
  const [loaded, setLoaded] = useState<{
    hasIdentityPages: boolean;
    vendorDisclaimers: KycDisclaimer[];
  }>();

  useEffect(() => {
    let active = true;
    // The fake service resolves at once; the loader keeps the walkthrough's
    // shape honest for the real flow's wait.
    (async () => {
      const service = getKalshiPrototypeKycService();
      const country = await service.getGeoCountry();
      const catalog = await service.fetchSessionDisclaimersByCountry({
        country,
      });
      const vendorDisclaimers = await service.fetchVendorDisclaimers({
        vendor: 'kalshi',
        country,
      });
      if (active) {
        setLoaded({
          hasIdentityPages:
            catalog.idOS.length > 0 || catalog.kycProvider.length > 0,
          vendorDisclaimers,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return <KalshiPrototypeLoading />;
  }
  return <KalshiPrototypeTerms {...props} {...loaded} />;
};

export default KalshiPrototypeTermsFlow;
