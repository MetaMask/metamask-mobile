import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import type { Theme } from '../../../../util/theme/models';
import { PerpsTabControlBar } from '../components/PerpsTabControlBar';
import { PerpsPositionListItem } from '../components/PerpsPositionListItem';
import { usePerpsTrading } from '../hooks';
import type { Position } from '../controllers/types';
import { strings } from '../../../../../locales/i18n';

interface PerpsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    sectionTitle: {
      paddingTop: 8,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
    emptyText: {
      textAlign: 'center' as const,
      marginTop: 8,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
  };
};

const PerpsView: React.FC<PerpsViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const { getPositions } = usePerpsTrading();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPositions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const positionsData = await getPositions();
        setPositions(positionsData || []);
      } catch (error) {
        console.error('Failed to load positions:', error);
        setPositions([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions],
  );

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const handleRefresh = useCallback(() => {
    loadPositions(true);
  }, [loadPositions]);

  const renderPositionsSection = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
      );
    }

    if (positions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.position.list.empty_title')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.emptyText}
          >
            {strings('perps.position.list.empty_description')}
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Alternative}
            style={styles.sectionTitle}
          >
            {strings('perps.position.title')}
          </Text>
        </View>
        <View>
          {positions.map((position, index) => (
            <PerpsPositionListItem
              key={`${position.coin}-${index}`}
              position={position}
            />
          ))}
        </View>
      </>
    );
  };

  return (
    <View style={styles.wrapper}>
      <PerpsTabControlBar />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>{renderPositionsSection()}</View>
      </ScrollView>
    </View>
  );
};

// const PerpsView: React.FC<PerpsViewProps> = () => {
//   const { styles } = useStyles(styleSheet, {});
//   const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

//   const [isLoading, setIsLoading] = useState(false);
//   const [isToggling, setIsToggling] = useState(false);
//   const [result, setResult] = useState<string>('');

//   // Use state hooks
//   const cachedAccountState = usePerpsAccount();
//   const { getAccountState } = usePerpsTrading();
//   const { toggleTestnet } = usePerpsNetworkConfig();
//   const currentNetwork = usePerpsNetwork();

//   // Use connection provider for connection state
//   const {
//     isConnected,
//     isConnecting,
//     isInitialized,
//     error: connectionError,
//     connect: reconnect,
//     resetError,
//   } = usePerpsConnection();

//   const getAccountBalance = useCallback(async () => {
//     setIsLoading(true);
//     setResult('');

//     try {
//       const accountState = await getAccountState();

//       const resultLines = [
//         '✅ Account Balance Retrieved Successfully!',
//         '',
//         `💰 Total Balance: $${accountState.totalBalance}`,
//         `💳 Available Balance: $${accountState.availableBalance}`,
//         `📊 Margin Used: $${accountState.marginUsed}`,
//         `📈 Unrealized PnL: $${accountState.unrealizedPnl}`,
//         '',
//         `🌐 Network: ${currentNetwork.toUpperCase()}`,
//       ];

//       setResult(resultLines.join('\n'));
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error
//           ? error.message
//           : strings('perps.errors.unknownError');
//       const fullErrorMessage = strings('perps.errors.accountBalanceFailed', {
//         error: errorMessage,
//       });
//       setResult(fullErrorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [getAccountState, currentNetwork]);

//   // Automatically load account state on mount and when network changes
//   useEffect(() => {
//     // Only load account state if we're connected and initialized
//     if (isConnected && isInitialized) {
//       // Fire and forget - errors are already handled in getAccountState
//       // and stored in the controller's state
//       getAccountState();
//     }
//   }, [getAccountState, currentNetwork, isConnected, isInitialized]);

//   const handleToggleTestnet = async () => {
//     setIsToggling(true);
//     setResult('');

//     try {
//       const toggleResult = await toggleTestnet();

//       if (toggleResult.success) {
//         const newNetwork = toggleResult.isTestnet ? 'TESTNET' : 'MAINNET';
//         setResult(
//           `✅ Successfully switched to ${newNetwork}\n🔄 Current UI shows: ${currentNetwork.toUpperCase()}`,
//         );
//       } else {
//         setResult(
//           strings('perps.errors.networkToggleFailed', {
//             error: toggleResult.error,
//           }),
//         );
//       }
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error
//           ? error.message
//           : strings('perps.errors.unknownError');
//       setResult(
//         strings('perps.errors.networkToggleFailed', { error: errorMessage }),
//       );
//     } finally {
//       setIsToggling(false);
//     }
//   };

//   const handleRetryConnection = async () => {
//     resetError();
//     await reconnect();
//   };

//   const handleMarketListNavigation = async () => {
//     navigation.navigate('PerpsMarketListView');
//   };

//   const handlePositionsNavigation = async () => {
//     navigation.navigate(Routes.PERPS.POSITIONS);
//   };

//   // Show connection error screen if there's an error
//   if (connectionError) {
//     return (
//       <PerpsConnectionErrorView
//         error={connectionError}
//         onRetry={handleRetryConnection}
//         isRetrying={isConnecting}
//       />
//     );
//   }

//   // Show loader while initializing or connecting
//   if (!isInitialized || isConnecting) {
//     return (
//       <PerpsLoader
//         message={
//           !isInitialized
//             ? 'Initializing Perps controller...'
//             : 'Connecting to Perps trading...'
//         }
//         fullScreen
//       />
//     );
//   }

//   return (
//     <ScreenView>
//       <View style={styles.content}>
//         <View style={styles.headerContainer}>
//           <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
//             Perps Trading (Minimal)
//           </Text>
//           <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
//             Core Controller & Services Testing
//           </Text>
//           <Text
//             variant={TextVariant.BodySM}
//             color={
//               currentNetwork === 'testnet'
//                 ? TextColor.Warning
//                 : TextColor.Success
//             }
//           >
//             Network: {currentNetwork.toUpperCase()}
//           </Text>
//           {cachedAccountState ? (
//             <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
//               Cached Balance: ${cachedAccountState.totalBalance}
//             </Text>
//           ) : isLoading ? (
//             <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
//               Loading balance...
//             </Text>
//           ) : (
//             <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
//               Balance will load automatically
//             </Text>
//           )}
//         </View>

//         <View style={styles.buttonContainer}>
//           {/* Core functionality buttons */}
//           <Button
//             variant={ButtonVariants.Primary}
//             size={ButtonSize.Lg}
//             width={ButtonWidthTypes.Full}
//             label="Get Account Balance"
//             onPress={getAccountBalance}
//             loading={isLoading}
//             style={styles.button}
//           />

//           <Button
//             variant={ButtonVariants.Secondary}
//             size={ButtonSize.Lg}
//             width={ButtonWidthTypes.Full}
//             label="Deposit Funds"
//             onPress={() => navigation.navigate(Routes.PERPS.DEPOSIT)}
//             style={styles.button}
//           />

//           <Button
//             variant={ButtonVariants.Secondary}
//             size={ButtonSize.Lg}
//             width={ButtonWidthTypes.Full}
//             label={`Switch to ${
//               currentNetwork === 'testnet' ? 'Mainnet' : 'Testnet'
//             }`}
//             onPress={handleToggleTestnet}
//             loading={isToggling}
//             style={styles.button}
//           />

//           <Button
//             variant={ButtonVariants.Secondary}
//             size={ButtonSize.Lg}
//             width={ButtonWidthTypes.Full}
//             label="View Markets"
//             onPress={handleMarketListNavigation}
//           />

//           <Button
//             variant={ButtonVariants.Primary}
//             size={ButtonSize.Lg}
//             width={ButtonWidthTypes.Full}
//             label="Positions"
//             onPress={handlePositionsNavigation}
//             loading={isLoading}
//             style={styles.button}
//           />
//         </View>

//         {result ? (
//           <View style={styles.resultContainer}>
//             <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
//               Result:
//             </Text>
//             <Text
//               variant={TextVariant.BodySM}
//               color={TextColor.Muted}
//               style={styles.resultText}
//             >
//               {result}
//             </Text>
//           </View>
//         ) : null}
//       </View>
//     </ScreenView>
//   );
// };

export default PerpsView;
