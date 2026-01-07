import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import ListHeaderWithSearch from '../../../shared/ListHeaderWithSearch';
import type { PerpsMarketListHeaderProps } from './PerpsMarketListHeader.types';

/**
 * PerpsMarketListHeader Component
 *
 * Header component for Perps Market List view with back button,
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
 * <PerpsMarketListHeader
 *   title="Markets"
 *   isSearchVisible={isSearchVisible}
 *   onSearchToggle={handleSearchToggle}
 * />
 * ```
 *
 * @example Custom back handler
 * ```tsx
 * <PerpsMarketListHeader
 *   onBack={customBackHandler}
 *   isSearchVisible={false}
 *   onSearchToggle={toggleSearch}
 * />
 * ```
 */
const PerpsMarketListHeader: React.FC<PerpsMarketListHeaderProps> = (props) => (
  <ListHeaderWithSearch
    {...props}
    defaultTitle={strings('perps.title')}
    searchPlaceholder={strings('perps.search_by_token_symbol')}
    cancelText={strings('perps.cancel')}
  />
);

export default PerpsMarketListHeader;
