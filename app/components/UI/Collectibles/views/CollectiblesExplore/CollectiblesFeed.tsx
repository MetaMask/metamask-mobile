import React, { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  TextField,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  useCollectiblesFeed,
  useCollectiblesComments,
} from '../../hooks/useCollectiblesSocial';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type {
  CollectiblesCommentTarget,
  CollectiblesFeedItem,
} from '../../services/clients/CollectiblesSocialApiClient';
import type { CollectiblesInventoryCard } from '../../types';
import { indexedCardPreview } from '../../components/CollectiblesDiscovery/IndexedCard';
import { DiscoveryCard } from '../../components/CollectiblesDiscovery/DiscoveryCard';
import { DiscoveryCardDetail } from '../CollectiblesCard/DiscoveryCardDetail';
import { ExploreState } from './ExploreState';
import {
  useCollectiblesAddComment,
  useCollectiblesSetReaction,
} from '../../hooks/useCollectiblesSocialCommands';
import { getCollectiblesCommentTarget as commentTarget } from '../../services/data/socialInvalidation';

function Comments({
  target,
  onClose,
}: {
  target: CollectiblesCommentTarget;
  onClose: () => void;
}) {
  const tw = useTailwind();
  const result = useCollectiblesComments(target);
  const addComment = useCollectiblesAddComment();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submit = async () => {
    if (!text.trim() || busy || !addComment.enabled) return;
    setBusy(true);
    setError(false);
    try {
      await addComment.mutateAsync({
        ...target,
        text: text.trim(),
      });
      setText('');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={tw.style('flex-1 bg-default')}
        edges={['left', 'right', 'bottom']}
      >
        <HeaderStandard
          includesTopInset
          title={strings('collectibles_discovery.comments')}
          onBack={onClose}
        />
        <FlashList
          data={result.data?.pages.flatMap((page) => page.items) ?? []}
          keyExtractor={(item) => item.commentId}
          contentContainerStyle={tw.style('px-4')}
          ListEmptyComponent={
            <ExploreState
              loading={result.isLoading}
              error={result.isError}
              onRetry={() => result.refetch()}
              empty="no_comments"
            />
          }
          onEndReached={() => {
            if (result.hasNextPage && !result.isFetchingNextPage)
              return result.fetchNextPage();
          }}
          renderItem={({ item }) => (
            <Box
              paddingVertical={3}
              gap={2}
              twClassName="border-b border-muted"
            >
              <Text variant={TextVariant.BodySm}>@{item.author.username}</Text>
              <Text>{item.text}</Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Box>
          )}
        />
        <Box padding={4} gap={2}>
          {error && (
            <Text color={TextColor.ErrorDefault}>
              {strings('collectibles_discovery.action_error')}
            </Text>
          )}
          <TextField
            value={text}
            isDisabled={busy}
            onChangeText={setText}
            placeholder={strings('collectibles_discovery.write_comment')}
            inputProps={{ maxLength: 500 }}
          />
          <Button
            isDisabled={busy || !text.trim() || !addComment.enabled}
            onPress={submit}
          >
            {strings('collectibles_discovery.post_comment')}
          </Button>
        </Box>
      </SafeAreaView>
    </Modal>
  );
}

/** Social reads and explicit interactions are isolated from wallet actions. */
export default function CollectiblesFeed({
  profileId,
  onProfile,
}: {
  profileId?: string;
  onProfile: (profileId: string) => void;
}) {
  const tw = useTailwind();
  const result = useCollectiblesFeed(profileId);
  const setReaction = useCollectiblesSetReaction();
  const presentation = useCollectiblesPresentation();
  const [comments, setComments] = useState<CollectiblesCommentTarget>();
  const [card, setCard] = useState<CollectiblesInventoryCard>();
  const [error, setError] = useState(false);
  const [reacting, setReacting] = useState<string>();
  const react = async (item: CollectiblesFeedItem) => {
    if (reacting || !setReaction.enabled) return;
    setReacting(item.itemId);
    setError(false);
    try {
      await setReaction.mutateAsync({
        ...commentTarget(item),
        liked: !item.engagement.likedByViewer,
      });
    } catch {
      setError(true);
    } finally {
      setReacting(undefined);
    }
  };
  return (
    <>
      {error && (
        <Text color={TextColor.ErrorDefault} twClassName="px-4">
          {strings('collectibles_discovery.action_error')}
        </Text>
      )}
      <FlashList
        data={result.data?.pages.flatMap((page) => page.items) ?? []}
        keyExtractor={(item) => item.itemId}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('pb-6')}
        testID="collectibles-feed-list"
        ListEmptyComponent={
          <ExploreState
            loading={result.isLoading}
            error={result.isError}
            onRetry={() => result.refetch()}
            empty="no_feed"
          />
        }
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage)
            return result.fetchNextPage();
        }}
        renderItem={({ item }) => {
          const cards: CollectiblesInventoryCard[] =
            item.type === 'collectibles_cards'
              ? item.data.cards.map((snapshot) => ({
                  mint: snapshot.mint,
                  name: snapshot.name,
                  image: snapshot.imageUrl ?? undefined,
                  insuredValue:
                    snapshot.insuredValueUsd === null
                      ? undefined
                      : Number(snapshot.insuredValueUsd),
                  grade: snapshot.grade,
                  rarity: snapshot.rarity,
                }))
              : (item.type === 'collectibles_pack'
                  ? [item.data.pack]
                  : item.data.packs
                ).flatMap((pack) =>
                  pack.card ? [indexedCardPreview(pack.card)] : [],
                );
          return (
            <Box
              padding={4}
              gap={3}
              twClassName="border-b border-muted"
              testID={`collectibles-feed-${item.itemId}`}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => onProfile(item.actor.profileId)}
              >
                <Text variant={TextVariant.HeadingSm}>
                  {item.actor.displayName}
                </Text>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  @{item.actor.username} ·{' '}
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </Pressable>
              {item.data.caption && <Text>{item.data.caption}</Text>}
              {item.type !== 'collectibles_cards' && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('collectibles_discovery.packs_opened', {
                    count:
                      item.type === 'collectibles_pack'
                        ? 1
                        : item.data.packs.length,
                  })}
                </Text>
              )}
              <Box twClassName="flex-row flex-wrap -mx-1">
                {cards.map((preview) => (
                  <Box key={preview.mint} twClassName="w-1/2 p-1">
                    <DiscoveryCard card={preview} onPress={setCard} />
                  </Box>
                ))}
              </Box>
              <Box twClassName="flex-row gap-3">
                <Button
                  variant={ButtonVariant.Tertiary}
                  isDisabled={Boolean(reacting) || !setReaction.enabled}
                  onPress={() => react(item)}
                >
                  {`${strings(
                    item.engagement.likedByViewer
                      ? 'collectibles_discovery.liked'
                      : 'collectibles_discovery.like',
                  )} · ${item.engagement.likes}`}
                </Button>
                <Button
                  variant={ButtonVariant.Tertiary}
                  onPress={() => setComments(commentTarget(item))}
                >
                  {`${strings('collectibles_discovery.comments')} · ${item.engagement.comments}`}
                </Button>
              </Box>
            </Box>
          );
        }}
      />
      {comments && (
        <Comments target={comments} onClose={() => setComments(undefined)} />
      )}
      {card && (
        <DiscoveryCardDetail card={card} onClose={() => setCard(undefined)} />
      )}
    </>
  );
}
