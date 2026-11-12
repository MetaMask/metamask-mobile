import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { collectiblesMotionHtml } from './collectiblesMotion.generated';
import {
  parseMotionMessage,
  parseCollectionCardLanded,
  parsePackPresentationPose,
  type PackPresentationPose,
  type CollectiblesMotionConfiguration,
} from './CollectiblesMotion.types';

const SOURCE = { html: collectiblesMotionHtml, baseUrl: 'about:blank' };

/** Isolated, bundled Replit DOM/CSS. There is no wallet bridge or remote script access. */
export default function CollectiblesMotion({
  configuration,
  isActive = true,
  onImageReady,
  onRevealed,
  onCompleted,
  onCardLanded,
  onError,
  onPackPress,
  testID,
}: {
  configuration: CollectiblesMotionConfiguration;
  isActive?: boolean;
  onImageReady?: () => void;
  onRevealed?: () => void;
  onCompleted?: () => void;
  onCardLanded?: (id: string) => void;
  onError?: () => void;
  onPackPress?: (pose: PackPresentationPose) => void;
  testID?: string;
}) {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const { animate } = useCollectiblesPresentation();
  const view = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduced, setReduced] = useState(true);
  const imageReady = useRef(false);
  const revealed = useRef(false);
  const completed = useRef(false);
  const landed = useRef(new Set<string>());
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  const payload = JSON.stringify({
    ...configuration,
    active: isActive && foreground,
    reduced: reduced || !animate,
    dark: themeAppearance === 'dark',
    copy: {
      Marketplace: strings('collectibles_discovery.market'),
      'Marketplace coming soon!': strings(
        'collectibles_discovery.market_coming_soon',
      ),
      'Discover your next grail\nor list cards': strings(
        'collectibles_discovery.market_discover',
      ),
      'Go to page {step}': strings('collectibles_discovery.market_page', {
        step: '{step}',
      }),
      Year: strings('collectibles.card.year'),
      Grade: strings('collectibles.card.grade'),
      Rarity: strings('collectibles.card.rarity'),
      Common: strings('collectibles.rarity.common'),
      Uncommon: strings('collectibles.rarity.uncommon'),
      Rare: strings('collectibles.rarity.rare'),
      Epic: strings('collectibles.rarity.epic'),
      'Show front': strings('collectibles.card.show_front'),
      'Show back': strings('collectibles.card.show_back'),
      'Retry image': strings('collectibles.cards.retry'),
    },
  });
  useEffect(() => {
    if (ready)
      view.current?.injectJavaScript(
        `window.collectiblesMotionUpdate?.(${payload});true;`,
      );
  }, [ready, payload]);
  const receive = useCallback(
    (event: WebViewMessageEvent) => {
      const landedId = parseCollectionCardLanded(
        event.nativeEvent.data,
        configuration.transfers,
      );
      if (landedId && !landed.current.has(landedId)) {
        landed.current.add(landedId);
        onCardLanded?.(landedId);
      }
      const pose = parsePackPresentationPose(event.nativeEvent.data);
      if (pose) onPackPress?.(pose);
      const message = parseMotionMessage(event.nativeEvent.data);
      if (message === 'ready') setReady(true);
      if (message === 'error') onError?.();
      if (message === 'imageReady' && !imageReady.current) {
        imageReady.current = true;
        onImageReady?.();
      }
      if (message === 'completed' && !completed.current) {
        completed.current = true;
        onCompleted?.();
      }
      if (message === 'revealed' && !revealed.current) {
        revealed.current = true;
        onRevealed?.();
      }
    },
    [
      onImageReady,
      onRevealed,
      onCompleted,
      onCardLanded,
      configuration.transfers,
      onPackPress,
      onError,
    ],
  );
  return (
    <WebView
      ref={view}
      source={SOURCE}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
      onMessage={receive}
      onLoadStart={() => setReady(false)}
      onError={onError}
      onContentProcessDidTerminate={onError}
      javaScriptEnabled
      domStorageEnabled={false}
      allowsInlineMediaPlayback={false}
      allowsLinkPreview={false}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      bounces={false}
      style={tw.style('flex-1 bg-transparent')}
      containerStyle={tw.style('flex-1 bg-transparent')}
      testID={testID}
    />
  );
}
