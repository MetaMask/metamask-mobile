import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { selectIsMusdConversionFlowEnabledFlag } from '../../../../UI/Earn/selectors/featureFlags';
import { selectMoneyHomeScreenEnabledFlag } from '../../../../UI/Money/selectors/featureFlags';
import { useMusdConversionEligibility } from '../../../../UI/Earn/hooks/useMusdConversionEligibility';
import { useMusdBalance } from '../../../../UI/Earn/hooks/useMusdBalance';
import MusdAggregatedRow from './MusdAggregatedRow';

import CashGetMusdEmptyState from './CashGetMusdEmptyState';
import Logger from '../../../../../util/Logger';
import { SectionRefreshHandle } from '../../types';

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
});

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
    const isMoneyHomeEnabled = useSelector(selectMoneyHomeScreenEnabledFlag);

    const isCashSectionEnabled = isMusdConversionEnabled && isGeoEligible;

    const handleViewCashTokens = useCallback(() => {
      if (isMoneyHomeEnabled) {
        navigation.navigate(Routes.MONEY.ROOT);
      } else {
        navigation.navigate(Routes.WALLET.CASH_TOKENS_FULL_VIEW);
      }
    }, [navigation, isMoneyHomeEnabled]);

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
      <View ref={sectionViewRef} onLayout={onLayout} style={styles.sectionGap}>
        <SectionHeader
          title={title}
          onPress={handleViewCashTokens}
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
      </View>
    );
  },
);

CashSection.displayName = 'CashSection';

export default CashSection;
