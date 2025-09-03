// Third party dependencies
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { Token as TokenType } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native-gesture-handler';
import { Hex } from '@metamask/utils';

// External Dependencies
import { MetaMetricsEvents } from '../../../core/Analytics';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import Token from './components/Token';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import {
  selectDetectedTokens,
  selectAllDetectedTokensFlat,
} from '../../../selectors/tokensController';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkClientId,
} from '../../../selectors/networkController';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { DetectedTokensSelectorIDs } from '../../../../e2e/selectors/wallet/DetectedTokensView.selectors';
import { TokenI } from '../../UI/Tokens/types';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '75%',
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 12,
      alignSelf: 'center',
    },
    headerLabel: {
      textAlign: 'center',
      ...fontStyles.normal,
      fontSize: 18,
      paddingVertical: 16,
      color: colors.text.default,
    },
    tokenList: { paddingHorizontal: 16 },
    buttonsContainer: {
      padding: 16,
      flexDirection: 'row',
    },
    buttonDivider: {
      width: 8,
    },
  });

interface IgnoredTokensByAddress {
  [address: string]: true;
}

const DetectedTokens = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const detectedTokens = useSelector(selectDetectedTokens);
  const allDetectedTokens = useSelector(
    selectAllDetectedTokensFlat,
  ) as TokenI[];
  const allNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const chainId = useSelector(selectEvmChainId);
  const isPopularNetworks = useSelector(selectIsPopularNetwork);
  const selectedNetworkClientId = useSelector(selectNetworkClientId);
  const [ignoredTokens, setIgnoredTokens] = useState<IgnoredTokensByAddress>(
    {},
  );
  const isAllNetworks = useSelector(selectIsAllNetworks);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const currentDetectedTokens =
    isPortfolioViewEnabled() && isAllNetworks && isPopularNetworks
      ? allDetectedTokens
      : detectedTokens;

  const detectedTokensForAnalytics = useMemo(
    () =>
      currentDetectedTokens.map(
        (token) => `${token.symbol} - ${token.address}`,
      ),
    [currentDetectedTokens],
  );

  const getTokenAddedAnalyticsParams = useCallback(
    ({ address, symbol }: { address: string; symbol: string }) => {
      try {
        return {
          token_address: address,
          token_symbol: symbol,
          chain_id: getDecimalChainId(chainId),
          source: 'Add token dropdown',
        };
      } catch (error) {
        Logger.error(
          error as Error,
          'DetectedTokens.getTokenAddedAnalyticsParams',
        );
        return undefined;
      }
    },
    [chainId],
  );

  const dismissModalAndTriggerAction = useCallback(
    (ignoreAllTokens?: boolean) => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { TokensController } = Engine.context as any;
      let title = '';
      let description = '';
      let errorMsg = '';
      const tokensToIgnore: TokenType[] = [];
      const tokensToImport = currentDetectedTokens.filter((token) => {
        const isIgnored = ignoreAllTokens || ignoredTokens[token.address];
        if (isIgnored) {
          tokensToIgnore.push(token);
        }
        return !isIgnored;
      });

      // Update toast description accordingly
      if (tokensToImport.length === 0 && tokensToIgnore.length > 0) {
        // Ignoring all tokens
        title = strings('wallet.token_toast.tokens_hidden_title');
        description = strings('wallet.token_toast.tokens_hidden_desc');
        errorMsg = 'DetectedTokens: Failed to hide all detected tokens!';
      } else if (
        (tokensToImport.length > 0 && tokensToIgnore.length > 0) ||
        (tokensToImport.length > 0 && tokensToIgnore.length === 0)
      ) {
        // At least some tokens are imported
        title = strings('wallet.token_toast.tokens_imported_title');
        description = strings('wallet.token_toast.tokens_imported_desc', {
          tokenSymbols: tokensToImport
            .map((token) => token.symbol.toUpperCase())
            .join(', '),
        });
        errorMsg = 'DetectedTokens: Failed to import detected tokens!';
      }

      sheetRef.current?.onCloseBottomSheet(async () => {
        try {
          if (tokensToIgnore.length > 0) {
            // Group tokens by their `chainId` using a plain object
            const tokensToIgnoreByChainId: Record<Hex, TokenType[]> = {};

            for (const token of tokensToIgnore) {
              const tokenChainId: Hex =
                (token as TokenI & { chainId: Hex }).chainId ?? chainId;

              if (!tokensToIgnoreByChainId[tokenChainId]) {
                tokensToIgnoreByChainId[tokenChainId] = [];
              }

              tokensToIgnoreByChainId[tokenChainId].push(token);
            }

            // Process all grouped tokens in parallel
            const ignorePromises = Object.entries(tokensToIgnoreByChainId).map(
              async ([networkId, tokens]) => {
                const chainConfig = allNetworks[networkId as Hex];
                const { defaultRpcEndpointIndex } = chainConfig;
                const { networkClientId: networkInstanceId } =
                  chainConfig.rpcEndpoints[defaultRpcEndpointIndex];

                const tokenAddresses = tokens.map((token) => token.address);

                await TokensController.ignoreTokens(
                  tokenAddresses,
                  networkInstanceId,
                );
              },
            );

            await Promise.all(ignorePromises);
          }
          if (tokensToImport.length > 0) {
            if (isPortfolioViewEnabled()) {
              // Group tokens by their `chainId` using a plain object
              const tokensByChainId: Record<Hex, TokenType[]> = {};

              for (const token of tokensToImport) {
                const tokenChainId: Hex =
                  (token as TokenI & { chainId: Hex }).chainId ?? chainId;

                if (!tokensByChainId[tokenChainId]) {
                  tokensByChainId[tokenChainId] = [];
                }

                tokensByChainId[tokenChainId].push(token);
              }

              // Process grouped tokens in parallel
              const importPromises = Object.entries(tokensByChainId).map(
                async ([networkId, tokens]) => {
                  const chainConfig = allNetworks[networkId as Hex];
                  const { defaultRpcEndpointIndex } = chainConfig;
                  const { networkClientId: networkInstanceId } =
                    chainConfig.rpcEndpoints[defaultRpcEndpointIndex];

                  await TokensController.addTokens(tokens, networkInstanceId);
                },
              );

              await Promise.all(importPromises);
            } else {
              await TokensController.addTokens(
                tokensToImport,
                selectedNetworkClientId,
              );
            }
            InteractionManager.runAfterInteractions(() => {
              tokensToImport.forEach(
                ({ address, symbol }: { address: string; symbol: string }) => {
                  const analyticsParams = getTokenAddedAnalyticsParams({
                    address,
                    symbol,
                  });

                  if (analyticsParams) {
                    trackEvent(
                      createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
                        .addProperties({
                          token_address: address,
                          token_symbol: symbol,
                          chain_id: getDecimalChainId(chainId),
                          source: 'detected',
                        })
                        .build(),
                    );
                  }
                },
              );
            });
          }
          NotificationManager.showSimpleNotification({
            status: `simple_notification`,
            duration: 5000,
            title,
            description,
          });
        } catch (err) {
          Logger.log(err, errorMsg);
        }
      });
    },
    [
      chainId,
      trackEvent,
      createEventBuilder,
      currentDetectedTokens,
      ignoredTokens,
      selectedNetworkClientId,
      allNetworks,
      getTokenAddedAnalyticsParams,
    ],
  );

  const triggerIgnoreAllTokens = () => {
    navigation.navigate('DetectedTokensConfirmation', {
      onConfirm: () => dismissModalAndTriggerAction(true),
      isHidingAll: true,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
        .addProperties({
          location: 'token_detection',
          token_standard: 'ERC20',
          asset_type: 'token',
          tokens: detectedTokensForAnalytics,
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  };

  const triggerImportTokens = async () => {
    if (Object.keys(ignoredTokens).length === 0) {
      // Import all tokens
      dismissModalAndTriggerAction();
    } else {
      // Handle ignoring all or mix of imports and ignored tokens
      navigation.navigate('DetectedTokensConfirmation', {
        onConfirm: () => dismissModalAndTriggerAction(),
      });
    }
  };

  const renderHeader = () => (
    <Text style={styles.headerLabel}>
      {strings(
        `detected_tokens.title${
          currentDetectedTokens.length > 1 ? '_plural' : ''
        }`,
        {
          tokenCount: currentDetectedTokens.length,
        },
      )}
    </Text>
  );

  const renderToken = ({ item }: { item: TokenType }) => {
    const { address } = item;
    const isChecked = !ignoredTokens[address];

    return (
      <Token
        token={item as TokenI & { chainId: Hex }}
        selected={isChecked}
        toggleSelected={(selected) => {
          const newIgnoredTokens = { ...ignoredTokens };
          if (selected) {
            delete newIgnoredTokens[address];
          } else {
            newIgnoredTokens[address] = true;
          }
          setIgnoredTokens(newIgnoredTokens);
        }}
      />
    );
  };

  const getTokenId = (item: TokenType) => item.address;

  const renderDetectedTokens = () => (
    <FlatList
      style={styles.tokenList}
      data={currentDetectedTokens}
      keyExtractor={getTokenId}
      renderItem={renderToken}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderButtons = () => {
    const importTokenCount =
      currentDetectedTokens.length - Object.keys(ignoredTokens).length;
    return (
      <View style={styles.buttonsContainer}>
        <StyledButton
          onPress={triggerIgnoreAllTokens}
          containerStyle={styles.fill}
          type={'normal'}
        >
          {strings('detected_tokens.hide_cta')}
        </StyledButton>
        <View style={styles.buttonDivider} />
        <StyledButton
          onPress={triggerImportTokens}
          containerStyle={styles.fill}
          type={'confirm'}
          disabled={importTokenCount <= 0}
          testID={DetectedTokensSelectorIDs.IMPORT_BUTTON_ID}
        >
          {strings('detected_tokens.import_cta', {
            tokenCount: importTokenCount,
          })}
        </StyledButton>
      </View>
    );
  };

  const trackCancelWithoutAction = (hasPendingAction?: boolean) => {
    if (hasPendingAction) {
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CANCELED)
        .addProperties({
          source: 'detected',
          tokens: detectedTokensForAnalytics,
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  };

  return (
    <BottomSheet ref={sheetRef} onClose={trackCancelWithoutAction}>
      {renderHeader()}
      {renderDetectedTokens()}
      {renderButtons()}
    </BottomSheet>
  );
};

export const createDetectedTokensNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.DETECTED_TOKENS,
);

export default DetectedTokens;
