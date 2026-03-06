import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import { useMusdConversionTokens } from '../../../../UI/Earn/hooks/useMusdConversionTokens';
import { MUSD_CONVERSION_APY } from '../../../../UI/Earn/constants/musd';
import MusdAggregatedRow from './MusdAggregatedRow';

interface CashSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * CashSection - Displays mUSD (MetaMask USD) as the first homepage section.
 * Shows aggregated mUSD balance across supported networks and optional "Claim bonus".
 * Section header navigates to the Cash token list page (mUSD-only, per network).
 */
const CashSection = ({
  sectionIndex,
  totalSectionsLoaded,
}: CashSectionProps) => {
  const sectionViewRef = useRef<View>(null);
  const navigation = useNavigation();
  const isMusdConversionEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  const { tokens: conversionTokens } = useMusdConversionTokens();
  const { hasMusdBalanceOnAnyChain } = useMusdBalance();

  const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;
  const hasConvertibleStablecoins = conversionTokens.length > 0;

  const handleViewCashTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW as never);
  }, [navigation]);

  useHomeViewedEvent({
    sectionRef: sectionViewRef,
    isLoading: false,
    sectionName: HomeSectionNames.CASH,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: !hasMusdBalanceOnAnyChain,
    itemCount: hasMusdBalanceOnAnyChain ? 1 : 0,
  });

  if (!isCashSectionEnabled) {
    return null;
  }

  const title = strings('homepage.sections.cash');

  return (
    <View ref={sectionViewRef}>
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewCashTokens} />
        {hasConvertibleStablecoins && (
          <SectionRow>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('homepage.sections.cash_annualized_copy', {
                percentage: MUSD_CONVERSION_APY,
              })}
            </Text>
          </SectionRow>
        )}
        {hasMusdBalanceOnAnyChain && (
          <SectionRow>
            <MusdAggregatedRow />
          </SectionRow>
        )}
      </Box>
    </View>
  );
};

CashSection.displayName = 'CashSection';

export default CashSection;
