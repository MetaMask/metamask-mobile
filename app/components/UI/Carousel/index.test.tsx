import React, { ReactElement } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import Carousel from './';
import { Theme } from '../../../util/theme/models';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

// Mock ScrollableTabView as a simple component that renders children
jest.mock('react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({
    children,
    onChangeTab,
  }: {
    children: ReactElement | ReactElement[];
    onChangeTab: (info: { i: number }) => void;
  }) => {
    const mockChildren = Array.isArray(children) ? children : [children];
    return mockChildren.map((child, index) => (
      <div key={index} onClick={() => onChangeTab({ i: index })}>
        {child}
      </div>
    ));
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
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
    } as Theme['colors'],
  }),
}));

// Mock the predefined slides
jest.mock('./carousel.types', () => ({
  PREDEFINED_SLIDES: [
    {
      id: 'test',
      title: 'Test Title',
      description: 'Test Description',
      undismissable: true,
      href: undefined,
    },
  ],
}));

const mockDispatch = jest.fn();

describe('Carousel', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: [],
        },
      }),
    );
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all banners', () => {
    const { getByText } = render(<Carousel />);

    expect(getByText('banner.bridge.title')).toBeTruthy();
    expect(getByText('banner.bridge.subtitle')).toBeTruthy();
    expect(getByText('banner.card.title')).toBeTruthy();
    expect(getByText('banner.card.subtitle')).toBeTruthy();
  });

  it('does not render when all banners are dismissed', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: ['bridge', 'card', 'fund', 'cashout'],
        },
      }),
    );

    const { toJSON } = render(<Carousel />);
    expect(toJSON()).toBeNull();
  });

  it('calls onClick when a slide is pressed', () => {
    const mockOnClick = jest.fn();
    const { getByText } = render(<Carousel onClick={mockOnClick} />);

    fireEvent.press(getByText('banner.bridge.title').parent.parent);
    expect(mockOnClick).toHaveBeenCalledWith('bridge');
  });

  it('dispatches dismissBanner action when close button is pressed', () => {
    const { getAllByTestId } = render(<Carousel />);
    const closeButtons = getAllByTestId('close-button');

    fireEvent.press(closeButtons[0]);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'DISMISS_BANNER',
      payload: 'bridge',
    });
  });

  it('shows progress dots only when there are multiple slides', () => {
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        banners: {
          dismissedBanners: ['card', 'fund', 'cashout'],
        },
      }),
    );

    const { queryByTestId } = render(<Carousel />);
    const progressDots = queryByTestId('progress-dots');
    expect(progressDots).toBeFalsy();
  });
});
