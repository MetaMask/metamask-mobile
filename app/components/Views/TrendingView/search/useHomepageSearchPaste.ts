import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  initiallyAvailable?: boolean;
}

export interface SearchOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
    HOMEPAGE_SEARCH_PASTE_PILL_AB_KEY,
    HOMEPAGE_SEARCH_PASTE_PILL_VARIANTS,
    HOMEPAGE_SEARCH_PASTE_PILL_AB_TEST_EXPOSURE_OPTIONS,
  );
  const isTreatment =
    (process.env.NODE_ENV !== 'test' && __DEV__) || variant.showPastePill;
  const previousAppState = useRef(AppState.currentState);
  const [clipboardContentAvailable, setClipboardContentAvailable] =
    useState(initiallyAvailable);

  const refreshClipboardAvailability = useCallback(async () => {
    if (!enabled || !isTreatment) {
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

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const returnedToForeground =
        previousAppState.current !== 'active' && nextAppState === 'active';
      previousAppState.current = nextAppState;

      if (returnedToForeground) {
        consumedClipboardRevisions.clear();
        setClipboardContentAvailable(false);
        refreshClipboardAvailability();
      }
    });

    return () => {
      subscription.remove();
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
