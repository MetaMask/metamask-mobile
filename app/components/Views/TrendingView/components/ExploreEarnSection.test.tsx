import React from 'react';
import { render } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import EarnSection from '../../../UI/Earn/components/EarnSection';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../../UI/Earn/constants/earnModuleEvents';
import { ExploreActiveTabProvider } from '../ExploreActiveTabContext';
import ExploreEarnSection from './ExploreEarnSection';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));
jest.mock('../../../UI/Earn/components/EarnSection', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;
const mockEarnSection = EarnSection as jest.MockedFunction<typeof EarnSection>;

const refresh = { trigger: 0, silentRefresh: true };

describe('ExploreEarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
  });

  it('enables Earn for its active Explore tab', () => {
    render(
      <ExploreActiveTabProvider activeTab="Now">
        <ExploreEarnSection tabName="Now" refresh={refresh} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      {
        enabled: true,
        refresh,
        tokenDetailsSource: TokenDetailsSource.ExploreEarn,
        analyticsContext: {
          screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_NOW_TAB,
          entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_NOW_TAB,
          component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
        },
      },
      undefined,
    );
  });

  it('disables Earn when another Explore tab is active', () => {
    render(
      <ExploreActiveTabProvider activeTab="Crypto">
        <ExploreEarnSection tabName="Now" refresh={refresh} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
      undefined,
    );
  });

  it('uses Crypto tab analytics context', () => {
    render(
      <ExploreActiveTabProvider activeTab="Crypto">
        <ExploreEarnSection tabName="Crypto" refresh={refresh} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({
        analyticsContext: {
          screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE_CRYPTO_TAB,
          entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_CRYPTO_TAB,
          component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
        },
      }),
      undefined,
    );
  });

  it('disables Earn when Explore screen is unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    render(
      <ExploreActiveTabProvider activeTab="Now">
        <ExploreEarnSection tabName="Now" refresh={refresh} />
      </ExploreActiveTabProvider>,
    );

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
      undefined,
    );
  });
});
