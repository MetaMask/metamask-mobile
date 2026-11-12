import React, { useState, type MutableRefObject } from 'react';
import { Image } from 'expo-image';
import {
  Box,
  Button,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  useCollectiblesProfile,
  useCollectiblesFollow,
} from '../../hooks/useCollectiblesSocial';
import { useCollectiblesWalletSummary } from '../../hooks/useCollectiblesDiscovery';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import CollectiblesFeed from './CollectiblesFeed';
import CollectiblesPokedex from './CollectiblesPokedex';
import ProfileCollectibles from './ProfileCollectibles';
import { ExploreState } from './ExploreState';

/** Social identity and complete linked-wallet activity remain separate from Core ownership. */
export default function CollectiblesProfile({
  profileId,
  onProfile,
  backActionRef,
}: {
  profileId: string;
  onProfile: (profileId: string) => void;
  backActionRef?: MutableRefObject<(() => void) | null>;
}) {
  const tw = useTailwind();
  const profile = useCollectiblesProfile(profileId);
  const follow = useCollectiblesFollow(profileId);
  const account = usePackPartnerAccount();
  const summary = useCollectiblesWalletSummary(profile.data?.accounts ?? []);
  const [tab, setTab] = useState('collectibles');
  if (!profile.data)
    return (
      <ExploreState
        loading={profile.isPending}
        error={profile.isError}
        onRetry={() => profile.refetch()}
      />
    );
  const isOwnProfile = profile.data.accounts.some(
    (item) => item.address === account?.address,
  );
  const header = (
    <>
      <Box padding={4} gap={2} twClassName="items-center">
        {profile.data.avatarUrl ? (
          <Image
            source={profile.data.avatarUrl}
            style={tw.style('w-20 h-20 rounded-full')}
            contentFit="cover"
          />
        ) : (
          <Box twClassName="w-20 h-20 rounded-full bg-muted items-center justify-center">
            <Text variant={TextVariant.HeadingLg}>
              {profile.data.displayName.slice(0, 1).toLocaleUpperCase()}
            </Text>
          </Box>
        )}
        <Text variant={TextVariant.HeadingLg}>{profile.data.displayName}</Text>
        <Text color={TextColor.TextAlternative}>@{profile.data.username}</Text>
        {profile.data.bio && (
          <Text twClassName="text-center">{profile.data.bio}</Text>
        )}
        <Text
          color={TextColor.TextAlternative}
          testID="collectibles-profile-followers"
        >
          {strings('collectibles.profile.followers', {
            count: profile.data.followerCount.toLocaleString(),
          })}
        </Text>
        {!isOwnProfile && (
          <Button
            variant={
              profile.data.isFollowing
                ? ButtonVariant.Secondary
                : ButtonVariant.Primary
            }
            isDisabled={!follow.enabled || follow.isPending}
            isLoading={follow.isPending}
            onPress={() => follow.mutate(!profile.data?.isFollowing)}
            testID="collectibles-profile-follow"
          >
            {strings(
              profile.data.isFollowing
                ? 'collectibles.profile.following'
                : 'collectibles.profile.follow',
            )}
          </Button>
        )}
        {follow.isError && (
          <Text color={TextColor.ErrorDefault}>
            {strings('collectibles.profile.follow_error')}
          </Text>
        )}
      </Box>
      <Box twClassName="flex-row px-4 pb-4 gap-3">
        {[
          [
            strings('collectibles.profile.spent'),
            summary.data?.spentUsd === null ||
            summary.data?.spentUsd === undefined
              ? '—'
              : formatUsd(Number(summary.data.spentUsd)),
          ],
          [
            strings('collectibles.profile.packs'),
            summary.data?.openedPackCount?.toLocaleString() ?? '—',
          ],
          [
            strings('collectibles.profile.epics'),
            summary.data?.epicCount?.toLocaleString() ?? '—',
          ],
        ].map(([label, value]) => (
          <Box key={label} twClassName="flex-1 items-center" gap={1}>
            <Text variant={TextVariant.HeadingSm}>{value}</Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {label}
            </Text>
          </Box>
        ))}
      </Box>
      <FilterButtonGroup value={tab} onChange={setTab} twClassName="px-4 pb-3">
        {['collectibles', 'feed', 'pokedex'].map((value) => (
          <FilterButton value={value} key={value}>
            {strings(`collectibles.profile.${value}`)}
          </FilterButton>
        ))}
      </FilterButtonGroup>
    </>
  );
  return (
    <Box twClassName="flex-1">
      {tab === 'collectibles' ? (
        <ProfileCollectibles
          profileId={profileId}
          header={header}
          isOwnProfile={isOwnProfile}
        />
      ) : (
        <>
          {header}
          {tab === 'pokedex' ? (
            <CollectiblesPokedex
              profileId={profileId}
              backActionRef={backActionRef}
            />
          ) : (
            <CollectiblesFeed profileId={profileId} onProfile={onProfile} />
          )}
        </>
      )}
    </Box>
  );
}
