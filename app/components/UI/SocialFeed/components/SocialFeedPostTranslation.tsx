import {
  Box,
  FontWeight,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, type TextLayoutEvent } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectAiSocialCommentTranslationEnabled } from '../../../../selectors/featureFlagController/socialCommentTranslation';
import type { SocialV1FeedPost } from '../types';
import { translateComment } from '../translateComment';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

const ENGLISH = 'en';

/** Feed captions collapse after this many lines. */
const FEED_COMMENT_PREVIEW_LINES = 4;

/**
 * Measures the full caption off-screen, then clamps the visible copy.
 * The measure text stays out of layout so a long post does not expand the
 * feed row before it collapses.
 */
const FeedCommentBody = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const onMeasureLayout = useCallback((event: TextLayoutEvent) => {
    const nextTruncated =
      event.nativeEvent.lines.length > FEED_COMMENT_PREVIEW_LINES;
    setIsTruncated((current) =>
      current === nextTruncated ? current : nextTruncated,
    );
  }, []);

  const showToggle = isTruncated || isExpanded;

  return (
    <Box>
      <Box
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        collapsable={false}
        twClassName="absolute left-0 right-0 opacity-0"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          onTextLayout={onMeasureLayout}
          testID={SocialFeedPostShellSelectorsIDs.COMMENT_MEASURE}
        >
          {text}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextDefault}
        numberOfLines={isExpanded ? undefined : FEED_COMMENT_PREVIEW_LINES}
        accessibilityLiveRegion="polite"
      >
        {text}
      </Text>
      {showToggle ? (
        <TextButton
          variant={TextVariant.BodySm}
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((expanded) => !expanded)}
          testID={SocialFeedPostShellSelectorsIDs.SEE_MORE}
        >
          {strings(
            isExpanded
              ? 'social_leaderboard.translation.see_less'
              : 'social_leaderboard.translation.see_more',
          )}
        </TextButton>
      ) : null}
    </Box>
  );
};

type TranslationPhase = 'idle' | 'pending' | 'translated' | 'failed';

interface TranslationState {
  identity: string;
  phase: TranslationPhase;
  translatedText: string | null;
}

/**
 * Shown under every saved Call, including English.
 * A pending composer post stays as written until the Call exists on the server.
 */
export const showsTranslationControl = (post: SocialV1FeedPost): boolean =>
  Boolean(post.item.comment && post.commentId && !post.isPending);

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
        if (result.state !== 'translated') {
          setTranslation({ identity, phase: 'failed', translatedText: null });
          return;
        }
        setTranslation({
          identity,
          phase: 'translated',
          translatedText: result.translations[ENGLISH] || null,
        });
      })
      .catch(() => {
        if (requestId.current === id && currentIdentity.current === identity) {
          setTranslation({ identity, phase: 'failed', translatedText: null });
        }
      });
  };

  return (
    <Box twClassName="mt-2">
      <FeedCommentBody
        key={`${post.id}:${visibleComment}`}
        text={visibleComment}
      />
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
