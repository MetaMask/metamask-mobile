import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictPositionEmpty from './PredictPositionEmpty';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.View testID={testID} {...props}>
        {children}
      </ReactNative.View>
    ),
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.Text testID={testID} {...props}>
        {children}
      </ReactNative.Text>
    ),
    TextVariant: { HeadingMd: 'heading-md' },
    TextColor: { TextDefault: 'text-default' },
    Icon: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.View testID={testID || `icon-${name}`} {...props}>
        <ReactNative.Text>{name}</ReactNative.Text>
      </ReactNative.View>
    ),
    IconName: { ArrowRight: 'ArrowRight' },
    IconSize: { Sm: 'sm' },
    IconColor: { IconAlternative: 'icon-alternative' },
  };
});

const mockSectionFn = jest.fn();
jest.mock(
  '../../../../Views/TrendingView/components/Sections/Section',
  () =>
    function MockSection(props: { sectionId: string }) {
      mockSectionFn(props);
      const ReactNative = jest.requireActual('react-native');
      return (
        <ReactNative.View testID="mock-section">
          <ReactNative.Text>Section: {props.sectionId}</ReactNative.Text>
        </ReactNative.View>
      );
    },
);

jest.mock('../../../../Views/TrendingView/sections.config', () => ({
  SECTIONS_CONFIG: {
    predictions: {
      id: 'predictions',
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.category.trending': 'Trending',
    };
    return translations[key] || key;
  },
}));

describe('PredictPositionEmpty', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
  };

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      render(<PredictPositionEmpty />);

      expect(screen.getByTestId('predict-position-empty')).toBeOnTheScreen();
    });

    it('renders section header with trending text', () => {
      render(<PredictPositionEmpty />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
    });

    it('renders Section component with predictions sectionId', () => {
      render(<PredictPositionEmpty />);

      expect(screen.getByTestId('mock-section')).toBeOnTheScreen();
      expect(screen.getByText('Section: predictions')).toBeOnTheScreen();
    });

    it('renders header with correct testID', () => {
      render(<PredictPositionEmpty />);

      expect(
        screen.getByTestId('predict-position-empty-section-header'),
      ).toBeOnTheScreen();
    });

    it('renders arrow icon', () => {
      render(<PredictPositionEmpty />);

      expect(screen.getByTestId('icon-ArrowRight')).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to market list with homepage_featured entryPoint when header is pressed', () => {
      render(<PredictPositionEmpty />);

      fireEvent.press(
        screen.getByTestId('predict-position-empty-section-header'),
      );

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED,
          },
        },
      );
    });
  });

  describe('Section integration', () => {
    it('passes correct props to Section component', () => {
      render(<PredictPositionEmpty />);

      expect(mockSectionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: 'predictions',
          refreshConfig: { trigger: 0, silentRefresh: true },
          toggleSectionEmptyState: expect.any(Function),
          toggleSectionLoadingState: expect.any(Function),
        }),
      );
    });
  });
});
