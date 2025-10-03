export { default as TabsList } from './TabsList';
export { default as TabsBar } from './TabsBar';
export { default as Tab } from './Tab';

// Export types from individual components
export * from './Tab/Tab.types';
export type { TabsBarProps } from './TabsBar/TabsBar.types';
export type {
  TabsListProps,
  TabsListRef,
  TabViewProps,
  TabItem,
} from './TabsList/TabsList.types';
