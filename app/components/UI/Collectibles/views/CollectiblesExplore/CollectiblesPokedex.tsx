import React, { useImperativeHandle, useState, type RefObject } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  TextFieldSearch,
  FilterButtonGroup,
  FilterButton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { useCollectiblesPokedex } from '../../hooks/useCollectiblesDiscovery';
import { useProfilePokedex } from '../../hooks/useCollectiblesSocial';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type { PokedexEntry } from '../../services/clients/CollectiblesApiClient';
import { ExploreState } from './ExploreState';
import { visiblePokedexEntries } from './pokedexEntries';

type PokedexBackAction = (() => void) | null;

/** The API owns permanent unlocks and the union of all wallets of a Social profile. */
export default function CollectiblesPokedex({
  profileId,
  backActionRef,
}: {
  profileId?: string;
  backActionRef?: RefObject<PokedexBackAction>;
}) {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const account = usePackPartnerAccount();
  const presentation = useCollectiblesPresentation();
  const [generation, setGeneration] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PokedexEntry>();
  const generationNumber =
    generation === 'all' ? undefined : Number(generation);
  const personal = useCollectiblesPokedex(
    profileId ? undefined : account?.address,
    generationNumber,
  );
  const profile = useProfilePokedex(profileId, generationNumber);
  const result = profileId ? profile : personal;
  const dex = result.data;
  const entries = visiblePokedexEntries(
    dex?.entries ?? [],
    generationNumber,
    query,
  );
  const percent = dex?.totalCount
    ? Math.min(100, Math.round((dex.completedCount / dex.totalCount) * 100))
    : 0;
  useImperativeHandle<PokedexBackAction, PokedexBackAction>(
    backActionRef,
    () => (selected ? () => setSelected(undefined) : null),
    [selected],
  );
  if (selected)
    return (
      <ScrollView
        contentContainerStyle={tw.style('p-4 gap-4')}
        testID="collectibles-pokedex-detail"
      >
        <Box twClassName="items-center bg-muted rounded-xl p-6" gap={2}>
          <Image
            source={selected.imageUrl}
            style={tw.style('w-32 h-32')}
            contentFit="contain"
          />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            #{String(selected.id).padStart(4, '0')}
          </Text>
          <Text variant={TextVariant.HeadingMd}>{selected.name}</Text>
        </Box>
        <Box twClassName="flex-row flex-wrap gap-3">
          {[
            [
              strings('collectibles.progress.pulls'),
              selected.pullCount?.toLocaleString() ?? '—',
            ],
            [
              strings('collectibles.progress.generation'),
              String(selected.generation),
            ],
            [
              strings('collectibles_discovery.first_pulled'),
              selected.firstOpenedAt
                ? new Date(selected.firstOpenedAt).toLocaleDateString()
                : '—',
            ],
            [
              strings('collectibles.progress.last_pulled'),
              selected.lastOpenedAt
                ? new Date(selected.lastOpenedAt).toLocaleDateString()
                : '—',
            ],
          ].map(([label, value]) => (
            <Box
              key={label}
              twClassName="bg-muted rounded-xl p-3 w-[48%]"
              gap={1}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {label}
              </Text>
              <Text variant={TextVariant.BodySm}>{value}</Text>
            </Box>
          ))}
        </Box>
        <Button
          isFullWidth
          variant={ButtonVariant.Secondary}
          onPress={() => setSelected(undefined)}
        >
          {strings('collectibles_discovery.back_pokedex')}
        </Button>
      </ScrollView>
    );
  if (
    dex &&
    generation === 'all' &&
    dex.completedCount === 0 &&
    !query.trim()
  ) {
    return (
      <Box padding={4} gap={4} testID="collectibles-pokedex-empty">
        <Text variant={TextVariant.HeadingMd} twClassName="text-center">
          {strings(
            profileId
              ? 'collectibles.progress.empty_public_title'
              : 'collectibles.progress.empty_title',
          )}
        </Text>
        <Text color={TextColor.TextAlternative} twClassName="text-center">
          {strings(
            profileId
              ? 'collectibles.progress.empty_public_description'
              : 'collectibles.progress.empty_description',
          )}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          onPress={() =>
            navigation.navigate(Routes.COLLECTIBLES.HOME, {
              initialTab: 'packs',
              category: 'Pokemon',
            })
          }
          testID="collectibles-pokedex-browse"
        >
          {strings('collectibles.progress.open_pokemon')}
        </Button>
      </Box>
    );
  }
  return (
    <>
      <FlashList
        data={entries}
        numColumns={3}
        keyExtractor={(entry) => String(entry.id)}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('px-3 pb-6')}
        testID="collectibles-pokedex-list"
        ListHeaderComponent={
          <Box gap={3} paddingBottom={4}>
            <Box padding={4} gap={2} twClassName="bg-muted rounded-xl">
              <Box twClassName="flex-row justify-between gap-2">
                <Text variant={TextVariant.BodyMd}>
                  {generationNumber
                    ? strings('collectibles_discovery.generation', {
                        count: generationNumber,
                      })
                    : strings('collectibles_discovery.pokedex')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {percent}%
                </Text>
              </Box>
              <Text color={TextColor.TextAlternative}>
                {strings('collectibles_discovery.discovered', {
                  count: dex?.completedCount ?? 0,
                  total: dex?.totalCount ?? 0,
                })}
              </Text>
              <Box
                twClassName="h-1 rounded-full bg-muted overflow-hidden"
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: dex?.totalCount ?? 0,
                  now: dex?.completedCount ?? 0,
                }}
              >
                <Box
                  twClassName="h-1 bg-primary-default"
                  style={{
                    width: `${dex?.totalCount ? Math.min(100, (dex.completedCount / dex.totalCount) * 100) : 0}%`,
                  }}
                />
              </Box>
            </Box>
            <TextFieldSearch
              value={query}
              onChangeText={setQuery}
              onPressClearButton={() => setQuery('')}
              placeholder={strings('collectibles_discovery.search_pokemon')}
              inputAccessibilityLabel={strings(
                'collectibles_discovery.search_pokemon',
              )}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <FilterButtonGroup value={generation} onChange={setGeneration}>
                {['all', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
                  (value) => (
                    <FilterButton key={value} value={value}>
                      {value === 'all'
                        ? strings('collectibles_discovery.all')
                        : strings('collectibles_discovery.generation', {
                            count: value,
                          })}
                    </FilterButton>
                  ),
                )}
              </FilterButtonGroup>
            </ScrollView>
          </Box>
        }
        ListEmptyComponent={
          <>
            <ExploreState
              loading={result.isLoading}
              error={result.isError}
              onRetry={() => result.refetch()}
              empty="no_pokemon"
            />
            {!result.isLoading && !result.isError && (
              <Button
                variant={ButtonVariant.Secondary}
                onPress={() => {
                  setQuery('');
                  setGeneration('all');
                }}
                testID="collectibles-pokedex-clear-filters"
              >
                {strings('collectibles.cards.clear_filters')}
              </Button>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            disabled={!item.unlocked}
            accessibilityRole="button"
            accessibilityLabel={
              item.unlocked
                ? item.name
                : strings('collectibles_discovery.undiscovered')
            }
            testID={`collectibles-pokedex-${item.id}`}
            style={tw.style('flex-1 p-1')}
          >
            <Box
              padding={3}
              gap={1}
              twClassName="bg-muted rounded-xl items-center"
            >
              <Image
                source={item.imageUrl}
                style={tw.style('w-16 h-16', !item.unlocked && 'opacity-30')}
                tintColor={
                  !item.unlocked ? tw.color('text-alternative') : undefined
                }
                contentFit="contain"
              />
              {item.unlocked &&
                item.pullCount !== undefined &&
                item.pullCount > 1 && (
                  <Box twClassName="absolute top-1 right-1 rounded-full bg-default px-1.5">
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.PrimaryDefault}
                    >
                      ×{item.pullCount}
                    </Text>
                  </Box>
                )}
              <Text variant={TextVariant.BodyXs} numberOfLines={1}>
                {item.unlocked
                  ? item.name
                  : strings('collectibles_discovery.undiscovered')}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                #{String(item.id).padStart(4, '0')}
              </Text>
            </Box>
          </Pressable>
        )}
      />
    </>
  );
}
