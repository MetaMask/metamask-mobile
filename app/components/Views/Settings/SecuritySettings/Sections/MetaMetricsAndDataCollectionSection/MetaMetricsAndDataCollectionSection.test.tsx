import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';

import MetaMetricsAndDataCollectionSection from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { MetaMetrics } from '../../../../../../core/Analytics';

jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation((callback) => callback());

jest.mock('../../../../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn(),
  trackAnonymousEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

jest.mock(
  '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useFocusEffect: jest.fn(),
  };
});

const mockUseParamsValues: {
  scrollToDetectNFTs?: boolean;
} = {
  scrollToDetectNFTs: undefined,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('MetaMetricsAndDataCollectionSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      MetaMetricsAndDataCollectionSection,
      { name: 'MetaMetricsAndDataCollectionSection' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('MetaMetrics switch on when optin', async () => {
    const { findByTestId } = renderScreen(
      MetaMetricsAndDataCollectionSection,
      { name: 'MetaMetricsAndDataCollectionSection' },
      { state: initialState },
    );

    const metaMetricsSwitch = await findByTestId(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );

    expect(metaMetricsSwitch).toBeTruthy();
    expect(metaMetricsSwitch.props.value).toBe(false);
    fireEvent(metaMetricsSwitch, 'valueChange', true);

    await waitFor(() => {
      expect(metaMetricsSwitch.props.value).toBe(true);
    });
  });
});
