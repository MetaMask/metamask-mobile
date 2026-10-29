import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import { withTiming } from 'react-native-reanimated';
import BalanceBreakdownSection, {
  BALANCE_BREAKDOWN_SECTION_TEST_ID,
} from './BalanceBreakdownSection';

const mockHomepageBalanceBreakdown = jest.fn();

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');

  return {
    ...Reanimated,
    useAnimatedStyle: jest.fn(() => ({})),
    useSharedValue: jest.fn((value) => ({ value })),
    withTiming: jest.fn((value) => value),
  };
});
jest.mock('../../components/HomepageBalanceBreakdown', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockHomepageBalanceBreakdown(props);
      return <View testID="homepage-balance-breakdown-mock" />;
    },
  };
});

describe('BalanceBreakdownSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the balance breakdown with section-local spacing', () => {
    const children = <></>;
    const { getByTestId } = render(
      <BalanceBreakdownSection accountGroupBalanceProps={{}} hideRows>
        {children}
      </BalanceBreakdownSection>,
    );

    expect(getByTestId(BALANCE_BREAKDOWN_SECTION_TEST_ID)).toHaveStyle({
      paddingBottom: 4,
    });
    expect(getByTestId('homepage-balance-breakdown-mock')).toBeOnTheScreen();
    expect(mockHomepageBalanceBreakdown).toHaveBeenCalledWith(
      expect.objectContaining({
        accountGroupBalanceProps: {},
        children,
        contentLayoutDuration: AnimationDuration.Regularly,
        hideRows: true,
      }),
    );
  });

  it('animates from the previous measured height when content changes', () => {
    const { getByTestId } = render(<BalanceBreakdownSection />);
    const section = getByTestId(BALANCE_BREAKDOWN_SECTION_TEST_ID);

    fireEvent(section, 'layout', {
      nativeEvent: { layout: { height: 100 } },
    });
    fireEvent(section, 'layout', {
      nativeEvent: { layout: { height: 140 } },
    });

    expect(withTiming).toHaveBeenCalledWith(140, {
      duration: AnimationDuration.Regularly,
    });
  });

  it('uses a shorter transition on constrained hardware', () => {
    const { getByTestId } = render(
      <BalanceBreakdownSection
        deviceCapability={{
          hardwareTier: 'LOW',
          networkTier: 'WIFI',
          networkTierResolved: true,
        }}
      />,
    );
    const section = getByTestId(BALANCE_BREAKDOWN_SECTION_TEST_ID);

    fireEvent(section, 'layout', {
      nativeEvent: { layout: { height: 100 } },
    });
    fireEvent(section, 'layout', {
      nativeEvent: { layout: { height: 140 } },
    });

    expect(withTiming).toHaveBeenCalledWith(140, {
      duration: AnimationDuration.Fast,
    });
  });
});
