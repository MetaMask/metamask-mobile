import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  ThemeProvider,
} from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { createRoot } from 'react-dom/client';
import FeedPost from '../../app/components/UI/SocialFeed/components/FeedPost';
import { mockOpenPerpsFeedItem } from '../../app/components/UI/SocialFeed/mocks/socialV1Feed.mock';
import ProfileHeader from '../../app/components/Views/SocialLeaderboard/TraderProfileView/components/ProfileHeader';
import TraderProfileCompactStats from '../../app/components/Views/SocialLeaderboard/TraderProfileView/components/TraderProfileCompactStats';
import UsernameClaimStep from '../../app/components/Views/SocialLeaderboard/ProfileOnboarding/UsernameClaimStep';

type PreviewScreen =
  | 'feed-before'
  | 'feed-translate'
  | 'feed-translated'
  | 'profile'
  | 'username';

declare global {
  interface Window {
    __SOCIAL_PREVIEW_SCREEN__?: PreviewScreen;
  }
}

const screenName: PreviewScreen =
  window.__SOCIAL_PREVIEW_SCREEN__ ?? 'feed-before';

const englishPost = mockOpenPerpsFeedItem();
const spanishPost = mockOpenPerpsFeedItem({
  id: 'v1-feed-thesis-es',
  comment: 'El mercado todavía no descuenta esta tesis.',
  author: {
    ...englishPost.author,
    id: 'v1-trader-mesa',
    username: 'mesa',
  },
});

const FeedPreview = ({
  translationEnabled,
  initiallyTranslated,
}: {
  translationEnabled: boolean;
  initiallyTranslated: boolean;
}) => (
  <Box gap={6} twClassName="px-4 py-6">
    <Text variant={TextVariant.HeadingMd}>Trending</Text>
    <FeedPost
      id={englishPost.id}
      author={englishPost.author}
      timestamp={englishPost.timestamp}
      comment={englishPost.comment}
      now={Date.now()}
      translationEnabled={translationEnabled}
      locale="en"
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        BTC short · 40X · +128.6%
      </Text>
    </FeedPost>
    <FeedPost
      id={spanishPost.id}
      author={spanishPost.author}
      timestamp={spanishPost.timestamp}
      comment={spanishPost.comment}
      now={Date.now()}
      translationEnabled={translationEnabled}
      locale="en"
      initiallyTranslated={initiallyTranslated}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        BTC short · 40X · +128.6%
      </Text>
    </FeedPost>
  </Box>
);

const ProfilePreview = () => (
  <Box twClassName="px-2 py-4">
    <Text variant={TextVariant.HeadingMd} twClassName="px-4 pb-2">
      Trader
    </Text>
    <ProfileHeader
      profile={{
        profileId: 'v1-trader-doji',
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        allAddresses: ['0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'],
        name: 'Doji',
        imageUrl: null,
      }}
      twitterHandle="doji"
    />
    <Box twClassName="px-4">
      <TraderProfileCompactStats
        stats={{ winRate7d: 0.92, pnl7d: 128400 }}
      />
    </Box>
  </Box>
);

const UsernamePreview = () => (
  <Box twClassName="px-4 py-6">
    <UsernameClaimStep
      username="mesa-trades"
      displayName="Mesa"
      usernameStatus="available"
      usernameClaimError={null}
      onUsernameChange={() => undefined}
      onDisplayNameChange={() => undefined}
      onShuffleUsername={() => undefined}
    />
  </Box>
);

const PreviewBody = () => {
  if (screenName === 'profile') {
    return <ProfilePreview />;
  }
  if (screenName === 'username') {
    return <UsernamePreview />;
  }
  if (screenName === 'feed-translate') {
    return (
      <FeedPreview translationEnabled initiallyTranslated={false} />
    );
  }
  if (screenName === 'feed-translated') {
    return <FeedPreview translationEnabled initiallyTranslated />;
  }
  return <FeedPreview translationEnabled={false} initiallyTranslated={false} />;
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <ThemeProvider theme={Theme.Light}>
      <PreviewBody />
    </ThemeProvider>,
  );
}
