import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { shouldStartLoadWithRequest } from '../../../../../util/browser';
import Device from '../../../../../util/device';
import { colors as commonColors } from '../../../../../styles/common';
import { MEMECOINS_TEST_IDS } from '../Memecoins.testIds';

interface ApplePayCheckoutOverlayProps {
  checkoutUrl: string;
  isSheetVisible: boolean;
  webviewHeight: number;
  amountUsd: string;
  tokenLabel: string;
  onMessage: (event: WebViewMessageEvent) => void;
  onCloseSheet: () => void;
}

const createStyles = (webviewHeight: number, isSheetVisible: boolean) =>
  StyleSheet.create({
    host: isSheetVisible
      ? {
          ...StyleSheet.absoluteFill,
          justifyContent: 'flex-end',
          zIndex: 20,
        }
      : {
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          overflow: 'hidden',
        },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: commonColors.blackTransparent,
    },
    webView: {
      width: '100%',
      height: isSheetVisible ? webviewHeight : 1,
      backgroundColor: commonColors.transparent,
      opacity: isSheetVisible ? 1 : 0,
    },
  });

/**
 * Keeps the Crossmint Apple Pay WebView mounted for preload, then reveals it
 * as a bottomsheet overlay on top of the quote page when the user taps Buy.
 */
function ApplePayCheckoutOverlay({
  checkoutUrl,
  isSheetVisible,
  webviewHeight,
  amountUsd,
  tokenLabel,
  onMessage,
  onCloseSheet,
}: ApplePayCheckoutOverlayProps) {
  const styles = useMemo(
    () => createStyles(webviewHeight, isSheetVisible),
    [isSheetVisible, webviewHeight],
  );

  return (
    <Box
      style={styles.host}
      pointerEvents={isSheetVisible ? 'auto' : 'none'}
      testID={MEMECOINS_TEST_IDS.CHECKOUT_OVERLAY}
    >
      {isSheetVisible ? (
        <Pressable
          style={styles.backdrop}
          onPress={onCloseSheet}
          testID={MEMECOINS_TEST_IDS.CHECKOUT_OVERLAY_BACKDROP}
        />
      ) : null}

      <Box
        twClassName={
          isSheetVisible
            ? 'rounded-t-2xl bg-background-default border border-border-muted px-4 pt-5 pb-3 gap-4'
            : undefined
        }
      >
        {isSheetVisible ? (
          <Box twClassName="items-center gap-2">
            <Box twClassName="w-10 h-1 rounded-full bg-border-muted" />
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              twClassName="text-center"
            >
              {strings('memecoins.apple_pay_sheet_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('memecoins.apple_pay_sheet_body', {
                amount: amountUsd,
                token: tokenLabel,
              })}
            </Text>
          </Box>
        ) : null}

        <WebView
          testID={MEMECOINS_TEST_IDS.CHECKOUT_WEBVIEW}
          source={{ uri: checkoutUrl }}
          style={styles.webView}
          enableApplePay
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={shouldStartLoadWithRequest}
          userAgent={
            Device.isIos()
              ? undefined
              : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
          }
        />

        {isSheetVisible ? (
          <Pressable onPress={onCloseSheet}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center py-2"
            >
              {strings('transaction.cancel')}
            </Text>
          </Pressable>
        ) : null}
      </Box>
    </Box>
  );
}

export default ApplePayCheckoutOverlay;
