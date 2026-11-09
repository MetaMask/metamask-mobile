import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  useWindowDimensions,
  type View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import ClipboardManager from '../../../core/ClipboardManager';
import Logger from '../../../util/Logger';
import { ensureError } from '../../../util/errorUtils';
import ShareCard from './ShareCard';
import type { ShareCardModel } from './ShareCard.types';
import { shareShareCardImage } from './shareCardImage';
import { ShareCardComposerSelectorsIDs } from './ShareCard.testIds';

const HORIZONTAL_PADDING = 16;
const MAX_CARD_SIZE = 480;
const COPIED_RESET_MS = 2000;

export type ShareCardComposerAction = 'copy_link' | 'share';

export interface ShareCardComposerProps {
  card: ShareCardModel;
  /**
   * False while the surface is still loading card data (e.g. the chart).
   * Share waits so the exported image never has a half-drawn card.
   */
  isReady?: boolean;
  /**
   * Link to the shared item. Copy link copies it, and Share sends it with the
   * image. Without a link only Share is shown, with the image alone.
   */
  link?: string;
  onClose: () => void;
  onLinkCopied?: () => void;
  /**
   * Fires only when the share sheet confirms a share. Android's chooser does
   * not report one reliably, so a share there may not fire this.
   */
  onShared?: () => void;
  onError?: (action: ShareCardComposerAction, error: Error) => void;
}

/**
 * Full-screen preview of a share card with Copy link and Share actions.
 * Surfaces render it from their own route with a card they built, so any
 * screen can offer the same composer.
 */
const ShareCardComposer = ({
  card,
  isReady = true,
  link,
  onClose,
  onLinkCopied,
  onShared,
  onError,
}: ShareCardComposerProps) => {
  const tw = useTailwind();
  const { width } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardSize = Math.min(width - HORIZONTAL_PADDING * 2, MAX_CARD_SIZE);

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    },
    [],
  );

  const reportError = useCallback(
    (action: ShareCardComposerAction, error: unknown) => {
      const normalized = ensureError(error, `ShareCardComposer.${action}`);
      Logger.error(normalized, {
        tags: { feature: 'share_card' },
        context: { name: `ShareCardComposer.${action}`, data: {} },
      });
      onError?.(action, normalized);
    },
    [onError],
  );

  const handleCopyLink = useCallback(async () => {
    if (!link) return;
    try {
      await ClipboardManager.setString(link);
      setIsCopied(true);
      // The label swap is silent for screen readers not focused on the button.
      AccessibilityInfo.announceForAccessibility(
        strings('share_card.link_copied'),
      );
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copiedTimeoutRef.current = null;
      }, COPIED_RESET_MS);
      onLinkCopied?.();
    } catch (error) {
      reportError('copy_link', error);
    }
  }, [link, onLinkCopied, reportError]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const outcome = await shareShareCardImage(cardRef.current, {
        message: link,
      });
      if (outcome === 'shared') {
        onShared?.();
      }
    } catch (error) {
      reportError('share', error);
    } finally {
      setIsSharing(false);
    }
  }, [link, onShared, reportError]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={ShareCardComposerSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.End}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={onClose}
          accessibilityLabel={strings('share_card.close')}
          testID={ShareCardComposerSelectorsIDs.CLOSE_BUTTON}
        />
      </Box>

      <Box twClassName="flex-1 pt-3" alignItems={BoxAlignItems.Center}>
        <ShareCard ref={cardRef} card={card} size={cardSize} />
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        gap={3}
        twClassName="px-4 pt-5 pb-4"
      >
        {link ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            twClassName="flex-1"
            onPress={handleCopyLink}
            testID={ShareCardComposerSelectorsIDs.COPY_LINK_BUTTON}
          >
            {isCopied
              ? strings('share_card.copied')
              : strings('share_card.copy_link')}
          </Button>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          twClassName="flex-1"
          isDisabled={!isReady || isSharing}
          isLoading={isSharing}
          onPress={handleShare}
          testID={ShareCardComposerSelectorsIDs.SHARE_BUTTON}
        >
          {strings('share_card.share')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default ShareCardComposer;
