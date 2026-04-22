import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { TabViewProps } from '../../../component-library/components-temp/Tabs/TabsList/TabsList.types';

/**
 * `TabsList` child wrapper — flex so tab content fills the area below the tab bar.
 */
export const TabView: React.FC<
  TabViewProps & { children?: React.ReactNode }
> = ({ children }) => <Box twClassName="flex-1">{children}</Box>;
