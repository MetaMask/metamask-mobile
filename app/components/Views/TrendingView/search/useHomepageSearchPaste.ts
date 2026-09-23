import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useABTest } from '../../../../hooks/useABTest';
import ClipboardManager from '../../../../core/ClipboardManager';
import { trackHomepageSearchPaste } from '../../../../util/analytics/homepageSearchPasteTracking';
import {
  HOMEPAGE_SEARCH_PASTE_PILL_AB_KEY,
  HOMEPAGE_SEARCH_PASTE_PILL_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_SEARCH_PASTE_PILL_VARIANTS,
} from './abTestConfig';

interface UseHomepageSearchPasteOptions {
  enabled: boolean;
  onPaste: (query: string, origin?: SearchOrigin) => void;
}

export interface SearchOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

const consumedClipboardKeys = new Set<string>();

export const isNewHomepageClipboardContent = (
  clipboardContent: string,
  clipboardRevision = 0,
): boolean =>
  clipboardContent.length > 0 &&
  !consumedClipboardKeys.has(`${clipboardRevision}:${clipboardContent}`);

export const useHomepageSearchPaste = ({
  enabled,
  onPaste,
}: UseHomepageSearchPasteOptions) => {
  const { variant } = useABTest(
    HOMEPAGE_SEARCH_PASTE_PILL_AB_KEY,
    HOMEPAGE_SEARCH_PASTE_PILL_VARIANTS,
    HOMEPAGE_SEARCH_PASTE_PILL_AB_TEST_EXPOSURE_OPTIONS,
  );
  const isTreatment = __DEV__ || variant.showPastePill;
  const [clipboardContentAvailable, setClipboardContentAvailable] =
    useState(false);

  const refreshClipboardAvailability = useCallback(async () => {
    if (!enabled || !isTreatment) {
      setClipboardContentAvailable(false);
      return;
    }

    try {
      const clipboardContent = String(
        (await ClipboardManager.getString()) ?? '',
      ).trim();
      setClipboardContentAvailable(
        isNewHomepageClipboardContent(
          clipboardContent,
          ClipboardManager.getRevision(),
        ),
      );
    } catch {
      setClipboardContentAvailable(false);
    }
  }, [enabled, isTreatment]);

  useFocusEffect(
    useCallback(() => {
      refreshClipboardAvailability();
    }, [refreshClipboardAvailability]),
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = ClipboardManager.addListener(() => {
      consumedClipboardKeys.clear();
      refreshClipboardAvailability();
    });

    return () => {
      subscription?.remove?.();
    };
  }, [enabled, refreshClipboardAvailability]);

  const handlePastePress = useCallback(
    async (origin?: SearchOrigin) => {
      try {
        const clipboardContent = String(
          (await ClipboardManager.getString()) ?? '',
        ).trim();

        if (!clipboardContent) {
          setClipboardContentAvailable(false);
          return;
        }

        consumedClipboardKeys.add(
          `${ClipboardManager.getRevision()}:${clipboardContent}`,
        );
        setClipboardContentAvailable(false);
        trackHomepageSearchPaste(clipboardContent);
        onPaste(clipboardContent, origin);
      } catch {
        setClipboardContentAvailable(false);
      }
    },
    [onPaste],
  );

  return {
    isTreatment,
    showPastePill: enabled && isTreatment && clipboardContentAvailable,
    handlePastePress,
  };
};
