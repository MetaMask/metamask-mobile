import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useAppThemeFromContext } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Card from '../../../../component-library/components/Cards/Card';
import XStocksList from './XStocksList/XStocksList';
import XStocksSkeleton from './XStocksSkeleton';
import {
  SOLANA_MAINNET_CHAIN_ID,
  getXStockIconUrl,
} from '../../../../constants/xstocks';
import {
  useXStocksData,
  type XStockWithData,
} from '../../../../components/hooks/useXStocksData';
import Routes from '../../../../constants/navigation/Routes';
import {
  setDestToken,
  setSourceToken,
} from '../../../../core/redux/slices/bridge';
import { BridgeToken, BridgeViewMode } from '../../../UI/Bridge/types';
import { getNativeSourceToken } from '../../../UI/Bridge/utils/tokenUtils';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 8,
      marginTop: 24, // Space between sections
    },
    cardContainer: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderColor: theme.colors.border.muted,
    },
  });

const XStocksSection: React.FC = () => {
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { xstocks, isLoading } = useXStocksData();

  // Show first 3 xStocks (sorted by market cap from the hook)
  const displayedXStocks = useMemo(() => xstocks.slice(0, 3), [xstocks]);

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.XSTOCKS_VIEW);
  }, [navigation]);

  const handleXStockPress = useCallback(
    (xstock: XStockWithData) => {
      // Get SOL as the source token
      const sourceToken = getNativeSourceToken(SOLANA_MAINNET_CHAIN_ID);

      // Create BridgeToken from xStock data for destination
      const destToken: BridgeToken = {
        address: xstock.solanaAddress,
        symbol: xstock.symbol,
        name: xstock.name,
        chainId: SOLANA_MAINNET_CHAIN_ID,
        decimals: xstock.decimals ?? 9, // Use API decimals or fallback to 9
        image: getXStockIconUrl(xstock),
      };

      // Set both source (SOL) and destination tokens in Redux
      dispatch(setSourceToken(sourceToken));
      dispatch(setDestToken(destToken));

      // Navigate to Bridge/Swap view in Unified mode
      navigation.navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourceToken,
          destToken,
          sourcePage: 'xstocks',
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    },
    [dispatch, navigation],
  );

  const SectionHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('xstocks.section_title')}
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('trending.view_all')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [styles.header, handleViewAll],
  );

  // Show skeleton during initial load or when there are no xStocks
  if (isLoading || displayedXStocks.length === 0) {
    return (
      <View>
        <SectionHeader />
        <Card style={styles.cardContainer} disabled>
          <XStocksSkeleton count={3} />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader />
      <Card style={styles.cardContainer} disabled>
        <XStocksList
          xstocks={displayedXStocks}
          onXStockPress={handleXStockPress}
        />
      </Card>
    </View>
  );
};

export default XStocksSection;
