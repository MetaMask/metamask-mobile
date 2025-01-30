import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Linking } from 'react-native';
import Carousel from './';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock ScrollableTabView as a simple View component that renders children
jest.mock('react-native-scrollable-tab-view', () => {
  const MockScrollableTabView = ({
    children,
    onChangeTab,
  }: {
    children: React.ReactNode;
    onChangeTab?: (info: { i: number }) => void;
  }) => {
    const mockChildren = Array.isArray(children) ? children : [children];
    return mockChildren.map((child, index) => (
      <div key={index} onClick={() => onChangeTab?.({ i: index })}>
        {child}
      </div>
    ));
  };
  MockScrollableTabView.displayName = 'MockScrollableTabView';
  return MockScrollableTabView;
});

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        alternative: '#F2F4F6',
        alternativePressed: '#E7E9EB',
        default: '#FFFFFF',
      },
      border: {
        muted: '#BBC0C5',
      },
      icon: {
        default: '#24272A',
        muted: '#BBC0C5',
      },
      text: {
        default: '#24272A',
      },
    },
  }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      build: () => ({}),
    }),
  }),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock image requires
jest.mock('../../../images/banners/banner_image_bridge.png', () => ({
  uri: 'bridge-image',
}));
jest.mock('../../../images/banners/banner_image_card.png', () => ({
  uri: 'card-image',
}));
jest.mock('../../../images/banners/banner_image_fund.png', () => ({
  uri: 'fund-image',
}));
jest.mock('../../../images/banners/banner_image_cashout.png', () => ({
  uri: 'cashout-image',
}));

const mockDispatch = jest.fn();

describe('Carousel', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: [],
        },
        browser: {
          tabs: [],
        },
      }),
    );
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    jest.clearAllMocks();
  });

  it('does not render when all banners are dismissed', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: ['bridge', 'card', 'fund', 'cashout'],
        },
        browser: {
          tabs: [],
        },
      }),
    );

    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toBeNull();
  });

  it('opens correct URLs when banners are clicked', async () => {
    const { getByText } = render(<Carousel />);

    // Test card banner
    fireEvent.press(getByText('banner.card.title').parent);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://portfolio.metamask.io/card',
    );

    // Test fund banner
    fireEvent.press(getByText('banner.fund.title').parent);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://portfolio.metamask.io/buy/build-quote',
    );

    // Test cashout banner
    fireEvent.press(getByText('banner.cashout.title').parent);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://portfolio.metamask.io/sell',
    );
  });
});
