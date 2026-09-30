import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useABTest } from '../../../../hooks/useABTest';
import ClipboardManager from '../../../../core/ClipboardManager';
import { trackHomepageSearchPaste } from '../../../../util/analytics/homepageSearchPasteTracking';
import type { SearchOrigin } from '../../../../util/homepageSearchTransition';
import {
  HOMEPAGE_SEARCH_AB_KEY,
  HOMEPAGE_SEARCH_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_SEARCH_VARIANTS,
} from './abTestConfig';

interface UseHomepageSearchPasteOptions {
  enabled: boolean;
  onPaste: (query: string, origin?: SearchOrigin) => void;
  initiallyAvailable?: boolean;
}

export type { SearchOrigin };

const consumedClipboardRevisions = new Set<number>();
const consumedClipboardListeners = new Set<() => void>();

export const isNewHomepageClipboardRevision = (
  hasClipboardString: boolean,
  clipboardRevision: number,
): boolean =>
  hasClipboardString && !consumedClipboardRevisions.has(clipboardRevision);

export const useHomepageSearchPaste = ({
  enabled,
  onPaste,
  initiallyAvailable = false,
}: UseHomepageSearchPasteOptions) => {
  const { variant } = useABTest(
    HOMEPAGE_SEARCH_AB_KEY,
    HOMEPAGE_SEARCH_VARIANTS,
    HOMEPAGE_SEARCH_AB_TEST_EXPOSURE_OPTIONS,
  );
  const isSearchHeaderEnabled = variant.showHomepageSearchBar;
  const [clipboardContentAvailable, setClipboardContentAvailable] =
    useState(initiallyAvailable);

  const refreshClipboardAvailability = useCallback(async () => {
    if (!enabled || !isSearchHeaderEnabled) {
      setClipboardContentAvailable(false);
      return;
    }

    try {
      const hasClipboardString = await ClipboardManager.hasString();
      setClipboardContentAvailable(
        isNewHomepageClipboardRevision(
          hasClipboardString,
          ClipboardManager.getRevision(),
        ),
      );
    } catch {
      setClipboardContentAvailable(false);
    }
  }, [enabled, isSearchHeaderEnabled]);

  useFocusEffect(
    useCallback(() => {
      refreshClipboardAvailability();
    }, [refreshClipboardAvailability]),
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleClipboardConsumed = () => {
      setClipboardContentAvailable(false);
    };
    consumedClipboardListeners.add(handleClipboardConsumed);
    const subscription = ClipboardManager.addListener(() => {
      consumedClipboardRevisions.clear();
      refreshClipboardAvailability();
    });

    return () => {
      consumedClipboardListeners.delete(handleClipboardConsumed);
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

        consumedClipboardRevisions.add(ClipboardManager.getRevision());
        setClipboardContentAvailable(false);
        consumedClipboardListeners.forEach((listener) => listener());
        trackHomepageSearchPaste();
        onPaste(clipboardContent, origin);
      } catch {
        setClipboardContentAvailable(false);
      }
    },
    [onPaste],
  );

  return {
    isSearchHeaderEnabled,
    showPastePill:
      enabled && isSearchHeaderEnabled && clipboardContentAvailable,
    handlePastePress,
  };
};
