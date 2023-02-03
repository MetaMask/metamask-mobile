import React, { useRef, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { Token as TokenType } from '@metamask/assets-controllers';
import Token from './components/Token';
import Engine from '../../../core/Engine';
import { useNavigation } from '@react-navigation/native';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { getDecimalChainId } from '../../../util/networks';
import { FlatList } from 'react-native-gesture-handler';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (colors: any) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    screen: { justifyContent: 'flex-end' },
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
      ...(fontStyles.normal as any),
      fontSize: 18,
      paddingVertical: 16,
      color: colors.text.default,
    },
    tokenList: { flex: 1, paddingHorizontal: 16 },
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
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const detectedTokens = useSelector<any, TokenType[]>(
    (state) =>
      state.engine.backgroundState.TokensController
        .detectedTokens as TokenType[],
  );
  const [ignoredTokens, setIgnoredTokens] = useState<IgnoredTokensByAddress>(
    {},
  );
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const detectedTokensForAnalytics = useMemo(
    () => detectedTokens.map((token) => `${token.symbol} - ${token.address}`),
    [detectedTokens],
  );

  const dismissModalAndTriggerAction = useCallback(
    (ignoreAllTokens?: boolean) => {
      const { TokensController } = Engine.context as any;
      let title = '';
      let description = '';
      let errorMsg = '';
      const tokensToIgnore: string[] = [];
      const tokensToImport = detectedTokens.filter((token) => {
        const isIgnored = ignoreAllTokens || ignoredTokens[token.address];
        if (isIgnored) {
          tokensToIgnore.push(token.address);
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

      modalRef.current?.dismissModal(async () => {
        const { NetworkController } = Engine.context as any;

        try {
          tokensToIgnore.length > 0 &&
            (await TokensController.ignoreTokens(tokensToIgnore));
          if (tokensToImport.length > 0) {
            await TokensController.addTokens(tokensToImport);
            InteractionManager.runAfterInteractions(() =>
              tokensToImport.forEach(({ address, symbol }) =>
                AnalyticsV2.trackEvent(MetaMetricsEvents.TOKEN_ADDED, {
                  token_address: address,
                  token_symbol: symbol,
                  chain_id: getDecimalChainId(
                    NetworkController?.state?.provider?.chainId,
                  ),
                  source: 'detected',
                }),
              ),
            );
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
    [detectedTokens, ignoredTokens],
  );

  const triggerIgnoreAllTokens = () => {
    const { NetworkController } = Engine.context as any;

    navigation.navigate('DetectedTokensConfirmation', {
      onConfirm: () => dismissModalAndTriggerAction(true),
      isHidingAll: true,
    });
    InteractionManager.runAfterInteractions(() =>
      AnalyticsV2.trackEvent(MetaMetricsEvents.TOKENS_HIDDEN, {
        location: 'token_detection',
        token_standard: 'ERC20',
        asset_type: 'token',
        tokens: detectedTokensForAnalytics,
        chain_id: getDecimalChainId(
          NetworkController?.state?.provider?.chainId,
        ),
      }),
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
        `detected_tokens.title${detectedTokens.length > 1 ? '_plural' : ''}`,
        {
          tokenCount: detectedTokens.length,
        },
      )}
    </Text>
  );

  const renderToken = ({ item }: { item: TokenType }) => {
    const { address } = item;
    const isChecked = !ignoredTokens[address];

    return (
      <Token
        token={item}
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
      data={detectedTokens}
      keyExtractor={getTokenId}
      renderItem={renderToken}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderButtons = () => {
    const importTokenCount =
      detectedTokens.length - Object.keys(ignoredTokens).length;
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
        >
          {strings('detected_tokens.import_cta', {
            tokenCount: importTokenCount,
          })}
        </StyledButton>
      </View>
    );
  };

  const trackCancelWithoutAction = (hasPendingAction: boolean) => {
    const { NetworkController } = Engine.context as any;
    if (hasPendingAction) {
      return;
    }
    AnalyticsV2.trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CANCELED, {
      source: 'detected',
      tokens: detectedTokensForAnalytics,
      chain_id: getDecimalChainId(NetworkController?.state?.provider?.chainId),
    });
  };

  return (
    <ReusableModal
      ref={modalRef}
      style={styles.screen}
      onDismiss={trackCancelWithoutAction}
    >
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />
        {renderHeader()}
        {renderDetectedTokens()}
        {renderButtons()}
      </View>
    </ReusableModal>
  );
};

export const createDetectedTokensNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.MODAL.DETECTED_TOKENS,
);

export default DetectedTokens;
