import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ViewPinBottomSheet from './ViewPinBottomSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ViewPinBottomSheetSelectors } from './ViewPinBottomSheet.testIds';

const mockUseParams = jest.fn();
const mockGoBack = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Linking as any).removeEventListener = jest.fn();

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn((stackId, screenName) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params?: any) => [stackId, { screen: screenName, params }],
  ),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../CardScreenshotDeterrent/CardScreenshotDeterrent', () => {
  const { View } = jest.requireActual('react-native');
  return (props: Record<string, unknown>) => (
    <View testID="card-screenshot-deterrent" {...props} />
  );
});

const TEST_IMAGE_URL =
  'https://cards.baanx.com/details-image?token=test-pin-token';

const renderWithProvider = (component: React.ComponentType) =>
  renderScreen(
    component,
    {
      name: 'ViewPinBottomSheet',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('ViewPinBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({
      imageUrl: TEST_IMAGE_URL,
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => <ViewPinBottomSheet />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the title', () => {
    const { getByText } = renderWithProvider(() => <ViewPinBottomSheet />);

    expect(getByText('Your Card PIN')).toBeOnTheScreen();
  });

  it('renders the PIN image with correct source', () => {
    const { getByTestId } = renderWithProvider(() => <ViewPinBottomSheet />);

    const pinImage = getByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE);

    expect(pinImage).toBeOnTheScreen();
    expect(pinImage.props.source).toEqual({ uri: TEST_IMAGE_URL });
  });

  it('displays skeleton while image is loading', () => {
    const { getByTestId } = renderWithProvider(() => <ViewPinBottomSheet />);

    expect(
      getByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE_SKELETON),
    ).toBeOnTheScreen();
  });

  it('hides skeleton after image loads', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(() => (
      <ViewPinBottomSheet />
    ));

    const pinImage = getByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE);

    fireEvent(pinImage, 'load');

    await waitFor(() => {
      expect(
        queryByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE_SKELETON),
      ).toBeNull();
    });
  });

  it('hides skeleton on image error', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(() => (
      <ViewPinBottomSheet />
    ));

    const pinImage = getByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE);

    fireEvent(pinImage, 'error');

    await waitFor(() => {
      expect(
        queryByTestId(ViewPinBottomSheetSelectors.PIN_IMAGE_SKELETON),
      ).toBeNull();
    });
  });

  it('renders CardScreenshotDeterrent as enabled', () => {
    const { getByTestId } = renderWithProvider(() => <ViewPinBottomSheet />);

    const deterrent = getByTestId('card-screenshot-deterrent');

    expect(deterrent.props.enabled).toBe(true);
  });

  it('renders the bottom sheet with correct testID', () => {
    const { getByTestId } = renderWithProvider(() => <ViewPinBottomSheet />);

    expect(
      getByTestId(ViewPinBottomSheetSelectors.BOTTOM_SHEET),
    ).toBeOnTheScreen();
  });
});
