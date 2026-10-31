import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextFieldSearch,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';

export interface CategoryPillOption {
  key: string;
  name: string;
}

export interface CategoryPillSearch {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID: string;
}

interface CategoryPillRowProps {
  pills: CategoryPillOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  testIdPrefix?: string;
  /**
   * Search stays pinned. The filter pills scroll beside it, then search
   * opens into `TextFieldSearch`.
   */
  search?: CategoryPillSearch;
}

const CategoryPillRow = ({
  pills,
  activeKey,
  onSelect,
  testIdPrefix = 'pill-row',
  search,
}: CategoryPillRowProps) => {
  const tw = useTailwind();
  const { themeAppearance } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const query = search?.value.trim() ?? '';
  const hasQuery = query.length > 0;

  if (search && isSearchOpen) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 py-2 pl-4 pr-2"
      >
        <Box twClassName="flex-1">
          <TextFieldSearch
            value={search.value}
            onChangeText={search.onChangeText}
            onPressClearButton={() => search.onChangeText('')}
            placeholder={search.placeholder}
            autoFocus
            clearButtonProps={{
              testID: `${testIdPrefix}-search-clear`,
            }}
            inputProps={{
              autoCapitalize: 'none',
              autoCorrect: false,
              keyboardAppearance: themeAppearance,
              testID: search.testID,
            }}
          />
        </Box>
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={() => setIsSearchOpen(false)}
          accessibilityLabel={strings('add_asset.owned_tokens.search_close')}
          testID={`${testIdPrefix}-search-close`}
        >
          {strings('navigation.cancel')}
        </Button>
      </Box>
    );
  }

  const pillScroller = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={tw.style('flex-1')}
      testID={`${testIdPrefix}-pills`}
      contentContainerStyle={tw.style(
        'items-center pr-4',
        search ? 'pl-0' : 'pl-4',
      )}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {pills.map((pill) => {
          const isSelected = activeKey === pill.key;
          return (
            <Pressable
              key={pill.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(pill.key)}
              testID={`${testIdPrefix}-pill-${pill.key}`}
              style={tw.style(
                'h-10 justify-center rounded-full px-3',
                isSelected ? 'bg-icon-default' : 'bg-muted',
              )}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={
                  isSelected ? TextColor.InfoInverse : TextColor.TextDefault
                }
                testID={`${testIdPrefix}-pill-label-${pill.key}`}
              >
                {pill.name}
              </Text>
            </Pressable>
          );
        })}
      </Box>
    </ScrollView>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="py-2 pl-4"
    >
      {search ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings('add_asset.owned_tokens.search_label')}
          accessibilityState={{ selected: hasQuery }}
          onPress={() => setIsSearchOpen(true)}
          testID={`${testIdPrefix}-search-toggle`}
          style={tw.style(
            'mr-3 h-10 flex-row items-center gap-2 rounded-full border bg-muted px-3',
            hasQuery ? 'border-default' : 'border-muted',
          )}
        >
          <Icon
            name={IconName.Search}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={hasQuery ? TextColor.TextDefault : TextColor.TextAlternative}
            numberOfLines={1}
            twClassName={hasQuery ? 'max-w-32' : undefined}
          >
            {hasQuery ? query : strings('add_asset.owned_tokens.search_label')}
          </Text>
        </Pressable>
      ) : null}
      <Box twClassName="min-w-0 flex-1 overflow-hidden">{pillScroller}</Box>
    </Box>
  );
};

export default CategoryPillRow;
