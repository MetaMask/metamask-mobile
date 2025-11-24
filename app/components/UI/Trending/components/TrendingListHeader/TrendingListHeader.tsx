import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import ListHeaderWithSearch from '../../../shared/ListHeaderWithSearch';
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
const TrendingListHeader: React.FC<TrendingListHeaderProps> = (props) => (
  <ListHeaderWithSearch
    {...props}
    defaultTitle={strings('trending.trending_tokens')}
    searchPlaceholder={strings('trending.search_placeholder')}
    cancelText={strings('trending.cancel')}
  />
);

export default TrendingListHeader;
