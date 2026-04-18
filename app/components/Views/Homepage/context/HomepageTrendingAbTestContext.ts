import { createContext, useContext } from 'react';

interface HomepageTrendingAbTestValue {
  /** Whether the A/B test is active (flag is set and matches a valid variant). */
  isActive: boolean;
  /** The resolved variant name (e.g. 'control', 'trendingSections'). */
  variantName: string;
}

const defaultValue: HomepageTrendingAbTestValue = {
  isActive: false,
  variantName: 'control',
};

export const HomepageTrendingAbTestContext =
  createContext<HomepageTrendingAbTestValue>(defaultValue);

export const useHomepageTrendingAbTest = () =>
  useContext(HomepageTrendingAbTestContext);
