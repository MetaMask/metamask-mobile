import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderSearch,
  HeaderSearchVariant,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import type { TrendingListHeaderProps } from './TrendingListHeader.types';

/**
 * TrendingListHeader Component
 *
 * Header component for Trending Tokens List view with back button,
 * title, and search toggle functionality
 *
 * Features:
 * - Back button with default or custom navigation handler
 * - Centered title with custom text support
 * - Search toggle button that changes icon based on visibility
 * - Keyboard dismiss on header press
 *
 * @example
 * ```tsx
 * <TrendingListHeader
 *   title="Trending Tokens"
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <TrendingListHeader
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const TrendingListHeader: React.FC<TrendingListHeaderProps> = ({
  title,
  isSearchVisible = false,
  searchQuery = '',
  onSearchQueryChange,
  onSearchClear,
  onBack,
  onSearchToggle,
  testID,
}) => {
  const navigation = useNavigation();

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onBack]);

  const handleSearchClear = useCallback(() => {
    if (onSearchClear) {
      onSearchClear();
      return;
    }
    onSearchQueryChange?.('');
  }, [onSearchClear, onSearchQueryChange]);

  if (isSearchVisible) {
    return (
      <HeaderSearch
        variant={HeaderSearchVariant.Inline}
        textFieldSearchProps={{
          value: searchQuery,
          onChangeText: onSearchQueryChange,
          placeholder: strings('trending.search_placeholder'),
          onPressClearButton: handleSearchClear,
          autoFocus: true,
          testID: testID ? `${testID}-search-bar` : undefined,
          clearButtonProps: {
            testID: testID ? `${testID}-search-field-clear` : undefined,
          },
        }}
        onPressCancelButton={onSearchToggle ?? (() => undefined)}
        cancelButtonProps={{
          testID: testID ? `${testID}-search-close` : undefined,
          twClassName: 'self-center',
          textProps: {
            twClassName: 'text-default',
          },
        }}
        twClassName="mr-0 mb-2"
      />
    );
  }

  return (
    <HeaderCompactStandard
      title={title || strings('trending.trending_tokens')}
      onBack={handleBack}
      backButtonProps={{
        testID: testID ? `${testID}-back-button` : undefined,
      }}
      endButtonIconProps={[
        {
          iconName: DSIconName.Search,
          onPress: onSearchToggle,
          testID: testID ? `${testID}-search-toggle` : undefined,
        },
      ]}
      testID={testID}
    />
  );
};

export default TrendingListHeader;
