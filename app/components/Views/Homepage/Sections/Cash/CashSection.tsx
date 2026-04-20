import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import MusdAggregatedRow from './MusdAggregatedRow';

import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import Logger from '../../../../../util/Logger';
import { SectionRefreshHandle } from '../../types';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user/selectors';

interface CashSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * CashSection - Displays mUSD (MetaMask USD) as the first homepage section.
 * Shows aggregated mUSD balance across supported networks and optional "Claim bonus".
 * Section header navigates to the Cash token list page (mUSD-only, per network).
 */
const CashSection = forwardRef<SectionRefreshHandle, CashSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const navigation = useNavigation();
    const isMusdConversionEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const { isEligible: isGeoEligible } = useMusdConversionEligibility();
    const { hasMusdBalanceOnAnyChain } = useMusdBalance();
    const hasSeenConversionEducationScreen = useSelector(
      selectMusdConversionEducationSeen,
    );
    const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);

    const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;

    const handleViewCashTokens = useCallback(() => {
      if (isMoneyHomeEnabled) {
        navigation.navigate(Routes.MONEY.ROOT);
        return;
      }

      if (!hasSeenConversionEducationScreen) {
        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
          params: {
            returnTo: { screen: Routes.WALLET.CASH_TOKENS_FULL_VIEW },
          },
        });
        return;
      }

      navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
    }, [isMoneyHomeEnabled, hasSeenConversionEducationScreen, navigation]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading: false,
      sectionName: HomeSectionNames.CASH,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !hasMusdBalanceOnAnyChain,
      itemCount: hasMusdBalanceOnAnyChain ? 1 : 0,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.CASH,
      contentReady: isCashSectionEnabled,
      isEmpty: !hasMusdBalanceOnAnyChain,
      enabled: isCashSectionEnabled,
    });

    const refresh = useCallback(async () => {
      // Force a remount so claim session lock and reward hooks are re-initialized.
      setRefreshVersion((version) => version + 1);
    }, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    if (!isCashSectionEnabled) {
      Logger.log(
        `[CashSection] not rendered flag=${isMusdConversionEnabled} geo=${isGeoEligible} reason=${!isMusdConversionEnabled ? 'flag_off' : 'geo_ineligible'}`,
      );
      return null;
    }

    const title = strings('homepage.sections.cash');

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <SectionHeader title={title} onPress={handleViewCashTokens} />
          {!hasMusdBalanceOnAnyChain ? (
            <SectionRow>
              <CashGetMusdEmptyState key={`cash-empty-${refreshVersion}`} />
            </SectionRow>
          ) : (
            <SectionRow>
              <MusdAggregatedRow key={`cash-row-${refreshVersion}`} />
            </SectionRow>
          )}
        </Box>
      </View>
    );
  },
);

CashSection.displayName = 'CashSection';

export default CashSection;
