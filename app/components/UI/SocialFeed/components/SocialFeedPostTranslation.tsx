import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectAiSocialCommentTranslationEnabled } from '../../../../selectors/featureFlagController/socialCommentTranslation';
import type { SocialV1FeedPost } from '../types';
import { translateComment } from '../translateComment';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

const ENGLISH = 'en';

type TranslationPhase = 'idle' | 'pending' | 'translated' | 'failed';

interface TranslationState {
  identity: string;
  phase: TranslationPhase;
  translatedText: string | null;
}

/**
 * Shown under a Call whose language is missing or not English.
 * A pending composer post stays as written until the Call exists on the server.
 */
export const showsTranslationControl = (post: SocialV1FeedPost): boolean => {
  if (!post.item.comment || !post.commentId || post.isPending) {
    return false;
  }
  return post.sourceLanguage?.toLowerCase() !== ENGLISH;
};

const TranslationAction = ({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) => (
  <Text
    accessibilityRole="button"
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    onPress={onPress}
    testID={testID}
  >
    {label}
  </Text>
);

const TranslationStatus = ({
  phase,
  onTranslate,
  postId,
}: {
  phase: TranslationPhase;
  onTranslate: () => void;
  postId: string;
}) => {
  if (phase === 'pending') {
    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        accessibilityLiveRegion="polite"
        accessibilityState={{ busy: true }}
        testID={`${SocialFeedPostShellSelectorsIDs.TRANSLATING}-${postId}`}
      >
        {strings('social_leaderboard.translation.translating')}
      </Text>
    );
  }

  if (phase === 'failed') {
    return (
      <Box
        twClassName="flex-row items-center gap-1"
        accessibilityLiveRegion="polite"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={`${SocialFeedPostShellSelectorsIDs.TRANSLATION_FAILED}-${postId}`}
        >
          {strings('social_leaderboard.translation.failed')}
        </Text>
        <TranslationAction
          label={strings('social_leaderboard.translation.try_again')}
          onPress={onTranslate}
          testID={`${SocialFeedPostShellSelectorsIDs.TRANSLATION_RETRY}-${postId}`}
        />
      </Box>
    );
  }

  if (phase === 'translated') {
    return (
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        accessibilityLiveRegion="polite"
        testID={`${SocialFeedPostShellSelectorsIDs.TRANSLATED}-${postId}`}
      >
        {strings('social_leaderboard.translation.translated_to_english')}
      </Text>
    );
  }

  return (
    <TranslationAction
      label={strings('social_leaderboard.translation.see_translation')}
      onPress={onTranslate}
      testID={`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-${postId}`}
    />
  );
};

const SocialFeedPostTranslation = ({ post }: { post: SocialV1FeedPost }) => {
  const translationEnabled = useSelector(
    selectAiSocialCommentTranslationEnabled,
  );
  const comment = post.item.comment ?? '';
  const identity = JSON.stringify([post.commentId, comment]);
  const [translation, setTranslation] = useState<TranslationState>({
    identity,
    phase: 'idle',
    translatedText: null,
  });
  const requestId = useRef(0);
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const isCurrentTranslation = translation.identity === identity;
  const phase = isCurrentTranslation ? translation.phase : 'idle';
  const translatedText = isCurrentTranslation
    ? translation.translatedText
    : null;
  const visibleComment =
    phase === 'translated' && translatedText ? translatedText : comment;

  useEffect(() => {
    if (phase === 'idle') {
      return;
    }
    const announcement =
      phase === 'pending'
        ? strings('social_leaderboard.translation.translating')
        : phase === 'failed'
          ? strings('social_leaderboard.translation.failed')
          : `${visibleComment} ${strings(
              'social_leaderboard.translation.translated_to_english',
            )}`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [phase, visibleComment]);

  const onTranslate = () => {
    const { commentId } = post;
    if (!commentId || phase === 'pending') {
      return;
    }
    const cached = post.translations?.[ENGLISH];
    if (cached) {
      setTranslation({ identity, phase: 'translated', translatedText: cached });
      return;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    setTranslation({ identity, phase: 'pending', translatedText: null });
    translateComment({ commentId, targetLanguage: ENGLISH })
      .then((result) => {
        if (requestId.current !== id || currentIdentity.current !== identity) {
          return;
        }
        const text =
          result.state === 'translated' ? result.translations[ENGLISH] : '';
        if (!text) {
          setTranslation({ identity, phase: 'failed', translatedText: null });
          return;
        }
        setTranslation({ identity, phase: 'translated', translatedText: text });
      })
      .catch(() => {
        if (requestId.current === id && currentIdentity.current === identity) {
          setTranslation({ identity, phase: 'failed', translatedText: null });
        }
      });
  };

  return (
    <Box twClassName="gap-2">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        accessibilityLiveRegion="polite"
      >
        {visibleComment}
      </Text>
      {translationEnabled && showsTranslationControl(post) ? (
        <TranslationStatus
          phase={phase}
          onTranslate={onTranslate}
          postId={post.id}
        />
      ) : null}
    </Box>
  );
};

export default SocialFeedPostTranslation;
