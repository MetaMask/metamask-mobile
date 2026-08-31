import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import HomepageEarnSection from './HomepageEarnSection';

const mockEarnSection = jest.fn((_props: Record<string, unknown>) => null);
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../../../../UI/Earn/components/EarnSection', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockEarnSection(props),
}));

describe('HomepageEarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsFocused.mockReturnValue(true);
  });

  it('passes Homepage telemetry metadata to EarnSection', () => {
    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenDetailsSource: TokenDetailsSource.HomeSection,
        homeAnalytics: { sectionIndex: 2, totalSectionsLoaded: 5 },
        enabled: true,
      }),
    );
  });

  it('disables EarnSection when Homepage is unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    expect(mockEarnSection).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
