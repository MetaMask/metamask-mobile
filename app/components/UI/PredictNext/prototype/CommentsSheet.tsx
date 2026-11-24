import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonBase,
  ButtonBaseSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RollingNumber } from './RollingNumber';
import { useTheme } from '../../../../util/theme';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { navigateToSocialLeaderboard } from '../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import ReactionChip, {
  REACTION_PILL_TW_CLASS,
} from '../../SocialFeed/components/ReactionChip';
import ReactionPickerBalloon, {
  type ReactionPickerAnchor,
} from '../../SocialFeed/components/ReactionPickerBalloon';
import SocialTraderIdentityRow from '../../SocialFeed/components/SocialTraderIdentityRow';
import EmojiAddIcon from '../../../../images/emoji-add.svg';
import { Chip } from './components';
import {
  COMMENT_SORTS,
  incomingComment,
  seedComments,
  sortComments,
  toggleReaction,
  youComment,
  type CommentSort,
  type ProtoComment,
} from './commentsData';
import { MODAL_HANDOFF_MS, type ProtoCommentsTarget } from './PrototypeState';
import { useLiveTicker } from './usePrototypeMotion';

/** A new simulated comment arrives this many ticks apart. */
const INCOMING_EVERY_TICKS = 6;
const MAX_COMMENTS = 40;
const SHEET_BODY_RATIO = 0.55;

const noop = () => undefined;

const SideTag = ({ comment }: { comment: ProtoComment }) => {
  const { side } = comment;
  if (!side) return null;
  return (
    <Box twClassName="self-start rounded-full bg-muted px-2 py-0.5">
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Bold}
        color={
          side.isPositive ? TextColor.SuccessDefault : TextColor.ErrorDefault
        }
      >
        {`Holds ${side.label} · ${side.price}¢`}
      </Text>
    </Box>
  );
};

const CommentItem = ({
  comment,
  isReply = false,
}: {
  comment: ProtoComment;
  isReply?: boolean;
}) => {
  const { colors } = useTheme();
  const [engagement, setEngagement] = useState({
    reactions: comment.reactions,
    userReaction: comment.userReaction,
  });
  const [anchor, setAnchor] = useState<ReactionPickerAnchor | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const rowRef = useRef<View>(null);

  const react = useCallback((emotion: string) => {
    setEngagement((current) => toggleReaction(current, emotion));
  }, []);

  const openPicker = useCallback(() => {
    rowRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsPickerVisible(true);
    });
  }, []);

  return (
    <SocialTraderIdentityRow
      author={comment.author}
      handle={comment.author.username}
      imageUrl={comment.author.avatarUri}
      timestampMs={comment.timestampMs}
      recyclingKey={comment.id}
      onMorePress={noop}
    >
      <Box testID={`comment-${comment.id}`} twClassName="gap-2 pb-4 pt-1">
        <SideTag comment={comment} />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {comment.text}
        </Text>
        <Box
          ref={rowRef}
          collapsable={false}
          twClassName="flex-row flex-wrap items-center gap-2"
        >
          {engagement.reactions.map((reaction) => (
            <ReactionChip
              key={reaction.emotion}
              emotion={reaction.emotion}
              count={reaction.count}
              isSelected={reaction.emotion === engagement.userReaction}
              onPress={() => react(reaction.emotion)}
              testID={`comment-chip-${comment.id}-${reaction.emotion}`}
            />
          ))}
          <ButtonBase
            size={ButtonBaseSize.Sm}
            twClassName={`${REACTION_PILL_TW_CLASS} border-muted w-8 px-0`}
            accessibilityLabel="Add reaction"
            onPress={openPicker}
            testID={`comment-add-reaction-${comment.id}`}
          >
            <EmojiAddIcon
              width={16}
              height={16}
              color={colors.icon.alternative}
              name="emoji-add"
            />
          </ButtonBase>
          {isReply ? null : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              twClassName="px-2"
            >
              Reply
            </Text>
          )}
        </Box>
        {comment.replies.map((reply) => (
          <Box key={reply.id} twClassName="pt-2">
            <CommentItem comment={reply} isReply />
          </Box>
        ))}
        <ReactionPickerBalloon
          visible={isPickerVisible}
          anchor={anchor}
          onClose={() => setIsPickerVisible(false)}
          onPick={(emotion) => {
            setIsPickerVisible(false);
            react(emotion);
          }}
        />
      </Box>
    </SocialTraderIdentityRow>
  );
};

/**
 * Market comments, modelled on Kalshi and Polymarket threads and built from
 * the Social V1 pieces: identity row, reaction chips, reaction picker. The
 * thread is simulated. New comments arrive on their own, and posting adds
 * yours locally.
 */
export const CommentsSheetContent = ({
  target,
  close,
}: {
  target: ProtoCommentsTarget;
  close: () => void;
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const navigation = useNavigation<AppNavigationProp>();
  const [comments, setComments] = useState(() => seedComments(target.eventId));
  const seedCount = useRef(comments.length).current;
  const [sort, setSort] = useState<CommentSort>('Top');
  const [draft, setDraft] = useState('');
  const incomingRef = useRef(0);
  const ticksRef = useRef(0);

  useLiveTicker(() => {
    ticksRef.current += 1;
    if (ticksRef.current % INCOMING_EVERY_TICKS !== 0) return;
    const next = incomingComment(target.eventId, incomingRef.current);
    incomingRef.current += 1;
    setComments((current) => [next, ...current].slice(0, MAX_COMMENTS));
  });

  const visible = useMemo(() => sortComments(comments, sort), [comments, sort]);
  const total = target.count + (comments.length - seedCount);

  const post = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setComments((current) => [youComment(target.eventId, text), ...current]);
    setDraft('');
    setSort('Newest');
  }, [draft, target.eventId]);

  const openSocial = useCallback(() => {
    close();
    setTimeout(
      () => navigateToSocialLeaderboard(navigation.navigate),
      MODAL_HANDOFF_MS,
    );
  }, [close, navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="comments-sheet"
    >
      <Box twClassName="gap-3 px-4 pb-4">
        <Box twClassName="flex-row items-center justify-between">
          <Box twClassName="min-w-0 flex-1 gap-0.5 pr-3">
            <Text variant={TextVariant.HeadingMd}>Comments</Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {target.title}
            </Text>
          </Box>
          <Box twClassName="flex-row items-center gap-1">
            <Icon
              name={IconName.Messages}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <RollingNumber
              testID="comments-total"
              value={String(total)}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
            />
          </Box>
        </Box>

        <Box twClassName="flex-row gap-2">
          {COMMENT_SORTS.map((option) => (
            <Chip
              key={option}
              label={option}
              isSelected={option === sort}
              onPress={() => setSort(option)}
            />
          ))}
        </Box>

        <ScrollView
          style={{ maxHeight: height * SHEET_BODY_RATIO }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {visible.length ? (
            visible.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              twClassName="py-6 text-center"
            >
              No holder comments yet
            </Text>
          )}
          <Box twClassName="gap-2 pb-2 pt-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
            >
              Want more than this market? See what top traders are saying.
            </Text>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={openSocial}
              testID="comments-open-social"
            >
              Open Social
            </Button>
          </Box>
        </ScrollView>

        <Box twClassName="flex-row items-center gap-2">
          <TextInput
            testID="comments-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment"
            placeholderTextColor={colors.text.muted}
            returnKeyType="send"
            onSubmitEditing={post}
            style={[
              tw.style('h-10 flex-1 rounded-full bg-muted px-4 text-default'),
              { color: colors.text.default },
            ]}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isDisabled={!draft.trim()}
            onPress={post}
            testID="comments-post"
          >
            Post
          </Button>
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
};
