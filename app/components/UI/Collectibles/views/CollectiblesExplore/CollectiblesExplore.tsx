import React, { useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CollectiblesStackParamList } from '../../types/navigation';
import CollectiblesHistory from './CollectiblesHistory';
import CollectiblesPokedex from './CollectiblesPokedex';
import CollectiblesLeaderboard from './CollectiblesLeaderboard';
import CollectiblesFeed from './CollectiblesFeed';
import CollectiblesProfile from './CollectiblesProfile';
import CollectiblesGreatestHits from './CollectiblesGreatestHits';

/** Secondary collectibles destinations share native navigation. */
export default function CollectiblesExplore() {
  const tw = useTailwind();
  const backActionRef = useRef<(() => void) | null>(null);
  const navigation =
    useNavigation<NativeStackNavigationProp<CollectiblesStackParamList>>();
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesExplore'>>();
  const { screen, profileId } = params;
  const showProfile = (id: string) =>
    navigation.push(Routes.COLLECTIBLES.EXPLORE, {
      screen: 'profile',
      profileId: id,
    });
  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={`collectibles-explore-${screen}`}
    >
      <HeaderStandard
        includesTopInset
        title={strings(`collectibles_discovery.${screen.replace('-', '_')}`)}
        onBack={() =>
          backActionRef.current ? backActionRef.current() : navigation.goBack()
        }
      />
      {screen === 'history' || screen === 'sales' ? (
        <CollectiblesHistory salesOnly={screen === 'sales'} />
      ) : screen === 'pokedex' ? (
        <CollectiblesPokedex backActionRef={backActionRef} />
      ) : screen === 'leaderboard' ? (
        <CollectiblesLeaderboard onProfile={showProfile} />
      ) : screen === 'feed' ? (
        <CollectiblesFeed onProfile={showProfile} />
      ) : screen === 'profile' && profileId ? (
        <CollectiblesProfile
          profileId={profileId}
          onProfile={showProfile}
          backActionRef={backActionRef}
        />
      ) : (
        <CollectiblesGreatestHits />
      )}
    </SafeAreaView>
  );
}
