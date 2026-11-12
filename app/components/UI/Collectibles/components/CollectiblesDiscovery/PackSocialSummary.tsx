import React from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ImageOrSvg,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PackSocialContext } from '../../services/clients/CollectiblesSocialApiClient';
import { CollectiblesPackSocialTestIds } from '../../Collectibles.testIds';

/** Batched Social metadata, shared by catalogue tiles and the two hero footers. */
export default function PackSocialSummary({
  context,
  onProfile,
  compact = false,
  showLatestEpic = false,
  reserveSpace = true,
  isLoading = false,
}: {
  context?: PackSocialContext;
  onProfile?: (profileId: string) => void;
  compact?: boolean;
  showLatestEpic?: boolean;
  /** Keep the same rows while metadata loads or the next pack has no activity. */
  reserveSpace?: boolean;
  isLoading?: boolean;
}) {
  const tw = useTailwind();
  const { fontScale } = useWindowDimensions();
  const people = context?.friends.length
    ? context.friends
    : context?.topBuyer
      ? [context.topBuyer]
      : [];
  const epic = showLatestEpic ? context?.lastFriendEpic : null;
  if (!reserveSpace && !people.length && !epic) return null;
  return (
    <Box
      gap={1}
      twClassName="min-w-0 shrink"
      testID={CollectiblesPackSocialTestIds.SUMMARY}
    >
      {isLoading ? (
        <Box twClassName="min-h-6 justify-center">
          <Skeleton
            testID={CollectiblesPackSocialTestIds.PEOPLE_LOADING}
            height={typography.sBodyXS.lineHeight * fontScale}
            width={100}
          />
        </Box>
      ) : people.length > 0 ? (
        <Box
          twClassName={`min-h-6 flex-row items-center gap-2 ${compact ? '' : 'justify-center'}`}
          testID={CollectiblesPackSocialTestIds.PEOPLE}
        >
          <Box twClassName="flex-row items-center">
            {people.slice(0, 3).map((person, index) => (
              <Pressable
                key={person.profileId}
                disabled={!onProfile}
                accessibilityRole="button"
                accessibilityLabel={person.displayName}
                testID={`collectibles-social-profile-${person.profileId}`}
                onPress={(event) => {
                  event?.stopPropagation();
                  onProfile?.(person.profileId);
                }}
                hitSlop={4}
              >
                <Box
                  twClassName={`h-6 w-6 rounded-full bg-muted overflow-hidden border border-default ${index === 0 ? 'ml-0' : '-ml-1.5'}`}
                >
                  {person.avatarUrl ? (
                    <ImageOrSvg
                      src={{ uri: person.avatarUrl }}
                      width={24}
                      height={24}
                    />
                  ) : (
                    <Text
                      variant={TextVariant.BodyXs}
                      twClassName="text-center"
                    >
                      {person.displayName.slice(0, 1)}
                    </Text>
                  )}
                </Box>
              </Pressable>
            ))}
          </Box>
          <Pressable
            disabled={!onProfile}
            accessibilityRole="button"
            accessibilityLabel={people[0].displayName}
            onPress={(event) => {
              event?.stopPropagation();
              onProfile?.(people[0].profileId);
            }}
            style={tw.style('shrink')}
          >
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {context?.friends.length
                ? strings('collectibles_discovery.opened_by', {
                    name: people[0].displayName,
                    count: context.friendOpenings,
                  })
                : strings('collectibles.pack_detail.top_buyer', {
                    name: people[0].displayName,
                  })}
            </Text>
          </Pressable>
        </Box>
      ) : reserveSpace ? (
        <Box
          twClassName="min-h-6 justify-center"
          testID={CollectiblesPackSocialTestIds.PEOPLE}
        >
          <Text
            variant={TextVariant.BodyXs}
            accessible={false}
            numberOfLines={1}
          >
            {'\u00a0'}
          </Text>
        </Box>
      ) : null}
      {isLoading && showLatestEpic ? (
        <Skeleton
          testID={CollectiblesPackSocialTestIds.EPIC_LOADING}
          height={typography.sBodyXS.lineHeight * fontScale}
          width={180}
        />
      ) : epic ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onProfile}
          onPress={(event) => {
            event?.stopPropagation();
            onProfile?.(epic.actor.profileId);
          }}
          testID={`collectibles-epic-profile-${epic.actor.profileId}`}
        >
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName={compact ? '' : 'text-center'}
            numberOfLines={1}
            testID={CollectiblesPackSocialTestIds.EPIC}
          >
            {strings('collectibles_discovery.friend_pulled_epic', {
              name: epic.actor.displayName,
            })}
          </Text>
        </Pressable>
      ) : reserveSpace && showLatestEpic ? (
        <Text
          variant={TextVariant.BodyXs}
          accessible={false}
          numberOfLines={1}
          testID={CollectiblesPackSocialTestIds.EPIC}
        >
          {'\u00a0'}
        </Text>
      ) : null}
    </Box>
  );
}
