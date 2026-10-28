import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { OwnedTokensTestIds } from './OwnedTokens.testIds';
import type { OwnedTokenFilter } from './model/types';

interface OwnedTokensHeaderProps {
  searchOpen: boolean;
  query: string;
  filter: OwnedTokenFilter;
  counts: Record<OwnedTokenFilter, number>;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onChangeQuery: (value: string) => void;
  onChangeFilter: (filter: OwnedTokenFilter) => void;
}

const FILTERS: OwnedTokenFilter[] = ['all', 'hidden', 'undetected'];

const filterTestId = (filter: OwnedTokenFilter): string => {
  if (filter === 'hidden') {
    return OwnedTokensTestIds.FILTER_HIDDEN;
  }
  if (filter === 'undetected') {
    return OwnedTokensTestIds.FILTER_UNDETECTED;
  }
  return OwnedTokensTestIds.FILTER_ALL;
};

const filterLabel = (filter: OwnedTokenFilter): string => {
  if (filter === 'hidden') {
    return strings('add_asset.owned_tokens.filter_hidden');
  }
  if (filter === 'undetected') {
    return strings('add_asset.owned_tokens.filter_undetected');
  }
  return strings('add_asset.owned_tokens.filter_all');
};

const OwnedTokensHeader = ({
  searchOpen,
  query,
  filter,
  counts,
  onOpenSearch,
  onCloseSearch,
  onChangeQuery,
  onChangeFilter,
}: OwnedTokensHeaderProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-row items-center px-4 pb-3">
      {searchOpen ? (
        <Box twClassName="mr-3 min-w-0 flex-1 flex-row items-center">
          <Box twClassName="min-w-0 flex-1">
            <TextFieldSearch
              value={query}
              onChangeText={onChangeQuery}
              onPressClearButton={() => onChangeQuery('')}
              placeholder={strings('add_asset.owned_tokens.search_placeholder')}
              autoFocus
              inputProps={{ testID: OwnedTokensTestIds.SEARCH_INPUT }}
            />
          </Box>
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Sm}
            onPress={onCloseSearch}
            testID={OwnedTokensTestIds.SEARCH_CANCEL}
          >
            {strings('add_asset.owned_tokens.cancel')}
          </Button>
        </Box>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings(
            'add_asset.owned_tokens.search_placeholder',
          )}
          onPress={onOpenSearch}
          testID={OwnedTokensTestIds.SEARCH_BUTTON}
          style={tw.style(
            'mr-3 h-11 w-11 items-center justify-center rounded-full',
          )}
        >
          <Icon
            name={IconName.Search}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Pressable>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('items-center')}
      >
        {FILTERS.map((item) => {
          const selected = item === filter;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChangeFilter(item)}
              testID={filterTestId(item)}
              style={tw.style(
                'mr-2 rounded-full px-3 py-2',
                selected ? 'bg-background-alternative' : undefined,
              )}
            >
              <Text variant={TextVariant.BodySm}>
                {strings('add_asset.owned_tokens.filter_count', {
                  label: filterLabel(item),
                  count: counts[item],
                })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default OwnedTokensHeader;
