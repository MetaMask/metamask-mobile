import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
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
import { MUSD_CONVERSION_APY } from '../../../../UI/Earn/constants/musd';
import MusdAggregatedRow from './MusdAggregatedRow';
import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import Logger from '../../../../../util/Logger';

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
  const { hasMusdBalanceOnAnyChain } = useMusdBalance();

  const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;

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
    Logger.log(
      `[CashSection] not rendered flag=${isMusdConversionEnabled} geo=${isGeoEligible} reason=${!isMusdConversionEnabled ? 'flag_off' : 'geo_ineligible'}`,
    );
    return null;
  }

  const title = strings('homepage.sections.cash');
  const copyStr = strings('homepage.sections.cash_annualized_copy', {
    percentage: MUSD_CONVERSION_APY,
  });
  const percentagePart = `${MUSD_CONVERSION_APY}%`;
  const copyParts = copyStr.split(percentagePart);

  return (
    <View ref={sectionViewRef}>
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewCashTokens} />
        {!hasMusdBalanceOnAnyChain ? (
          <SectionRow>
            <CashGetMusdEmptyState />
          </SectionRow>
        ) : (
          <>
            <SectionRow>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {copyParts.length >= 2 ? (
                  <>
                    {copyParts[0]}
                    <Text
                      color={TextColor.SuccessDefault}
                      fontWeight={FontWeight.Medium}
                    >
                      {percentagePart}
                    </Text>
                    {copyParts[1]}
                  </>
                ) : (
                  copyStr
                )}
              </Text>
            </SectionRow>
            <SectionRow>
              <MusdAggregatedRow />
            </SectionRow>
          </>
        )}
      </Box>
    </View>
  );
};

CashSection.displayName = 'CashSection';

export default CashSection;
