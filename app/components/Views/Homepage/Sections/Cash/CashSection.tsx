import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import MusdAggregatedRow from './MusdAggregatedRow';
import { useCashNavigation } from './useCashNavigation';

import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import Logger from '../../../../../util/Logger';
import { SectionRefreshHandle } from '../../types';

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
    const isMusdConversionEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);
    const { isEligible: isGeoEligible } = useMusdConversionEligibility();
    const { hasMusdBalanceOnAnyChain } = useMusdBalance();
    const { navigateToCash } = useCashNavigation();

    const isCashSectionEnabled =
      isMusdConversionEnabled && isGeoEligible && !isMoneyHomeEnabled;

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
      let reason = 'flag_off';
      if (isMusdConversionEnabled) {
        reason = !isGeoEligible ? 'geo_ineligible' : 'money_home_on';
      }
      Logger.log(
        `[CashSection] not rendered flag=${isMusdConversionEnabled} geo=${isGeoEligible} moneyHome=${isMoneyHomeEnabled} reason=${reason}`,
      );
      return null;
    }

    const title = strings('homepage.sections.money');

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box gap={3}>
          <SectionHeader
            title={title}
            onPress={navigateToCash}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('cash')}
          />
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
