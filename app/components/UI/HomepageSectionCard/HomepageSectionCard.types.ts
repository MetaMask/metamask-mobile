import { ReactNode } from 'react';

/**
 * Props for the HomepageSectionCard component
 */
export interface HomepageSectionCardProps {
  /**
   * Section title displayed in the header
   */
  title: string;
  /**
   * Optional callback when "View All" (chevron) is pressed
   * When provided, shows chevron icon and makes header pressable
   */
  onViewAll?: () => void;
  /**
   * Whether the section is in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether the section has no data
   */
  isEmpty?: boolean;
  /**
   * Whether to show the section when empty (default: false)
   */
  showWhenEmpty?: boolean;
  /**
   * Function to render skeleton loading state
   */
  renderSkeleton?: () => ReactNode;
  /**
   * Section content
   */
  children: ReactNode;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}

/**
 * Style sheet input parameters
 */
export interface HomepageSectionCardStyleSheetVars {
  theme: {
    colors: {
      background: {
        section: string;
      };
    };
  };
}
