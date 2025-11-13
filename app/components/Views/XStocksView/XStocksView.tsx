import React, { useCallback, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import {
  SOLANA_MAINNET_CHAIN_ID,
  getXStockIconUrl,
} from '../../../constants/xstocks';
import {
  useXStocksData,
  type XStockWithData,
} from '../../hooks/useXStocksData';
import {
  setDestToken,
  setSourceToken,
} from '../../../core/redux/slices/bridge';
import { BridgeToken, BridgeViewMode } from '../../UI/Bridge/types';
import Routes from '../../../constants/navigation/Routes';
import Card from '../../../component-library/components/Cards/Card';
import { useAppThemeFromContext } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import XStockRowItem from '../TrendingView/XStocksSection/XStockRowItem/XStockRowItem';
import XStocksSkeleton from '../TrendingView/XStocksSection/XStocksSkeleton';
import { getNativeSourceToken } from '../../UI/Bridge/utils/tokenUtils';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      marginTop: 10,
      paddingLeft: 16,
      paddingRight: 16,
    },
    cardContainer: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderColor: theme.colors.border.muted,
      marginBottom: 16,
    },
    header: {
      marginBottom: 16,
    },
  });

const XStocksView: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { xstocks, isLoading } = useXStocksData();

  const handleBackPress = useCallback(() => {
    navigation.goBack();
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
        decimals: xstock.decimals ?? 9,
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

  return (
    <Box
      style={{ paddingTop: insets.top }}
      twClassName="flex-1 bg-default"
      testID="xstocks-view"
    >
      {/* Header */}
      <Box twClassName="flex-row justify-between items-center px-4 py-3">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Lg}
          onPress={handleBackPress}
          testID="xstocks-view-back-button"
        />
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-default flex-1 ml-4"
        >
          {strings('xstocks.title')}
        </Text>
      </Box>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-alternative mb-4"
          style={styles.header}
        >
          {strings('xstocks.description')}
        </Text>

        <Card style={styles.cardContainer} disabled>
          {isLoading ? (
            <XStocksSkeleton count={10} />
          ) : (
            <View>
              {xstocks.map((xstock) => (
                <XStockRowItem
                  key={xstock.solanaAddress}
                  xstock={xstock}
                  onPress={handleXStockPress}
                />
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Box>
  );
};

export default XStocksView;
