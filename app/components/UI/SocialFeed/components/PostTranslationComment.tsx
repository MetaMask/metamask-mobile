import {
  Box,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import { postNeedsTranslation } from '../translation/postLanguage';
import { translatePost } from '../translation/stubPostTranslation';
import PositionCardComment from './PositionCardComment';

export interface PostTranslationCommentProps {
  comment?: string;
  testID?: string;
  /**
   * Version-gated flag, already resolved by a selector. The row does not
   * re-check the app version.
   */
  enabled?: boolean;
  /** User locale, for example `en` or `en-US`. */
  locale?: string;
  /** Test id for the Translate / Show original control. */
  translateTestID?: string;
  /** Opens on the translated caption. The feed leaves this off. */
  initiallyTranslated?: boolean;
}

/**
 * Caption plus an on-tap Translate control.
 *
 * Translation is a local stub and runs only after a press, so the row adds
 * no fetch, prefetch, image, or animation. That stays on the product-default
 * cell of the device-capability matrix for every hardware and network tier,
 * including `NONE`.
 */
const PostTranslationComment: React.FC<PostTranslationCommentProps> = ({
  comment,
  testID,
  enabled = false,
  locale = 'en',
  translateTestID,
  initiallyTranslated = false,
}) => {
  const [showingTranslation, setShowingTranslation] =
    useState(initiallyTranslated);
  const canTranslate = Boolean(
    enabled && comment && postNeedsTranslation(comment, locale),
  );

  if (!canTranslate || !comment) {
    return <PositionCardComment comment={comment} testID={testID} />;
  }

  const translation = showingTranslation
    ? translatePost(comment, locale)
    : null;

  return (
    <Box gap={1}>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        testID={testID}
      >
        {translation?.text ?? comment}
      </Text>
      <TextButton
        variant={TextVariant.BodySm}
        onPress={() => setShowingTranslation((current) => !current)}
        testID={translateTestID}
      >
        {showingTranslation
          ? strings('social_leaderboard.feed.show_original')
          : strings('social_leaderboard.feed.translate')}
      </TextButton>
    </Box>
  );
};

export default PostTranslationComment;
