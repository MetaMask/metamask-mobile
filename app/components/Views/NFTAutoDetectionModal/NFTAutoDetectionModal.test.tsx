import React from 'react';
import NFTAutoDetectionModal from './NFTAutoDetectionModal';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { fireEvent } from '@testing-library/react-native';
import { RootState } from 'app/reducers';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const setUseNftDetectionSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setUseNftDetection',
);

const setDisplayNftMediaSpy = jest.spyOn(
  Engine.context.PreferencesController,
  'setDisplayNftMedia',
);
jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setUseNftDetection: jest.fn(),
      setDisplayNftMedia: jest.fn(),
    },
  },
}));

const initialState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        displayNftMedia: true,
      },
    },
  },
};

jest.mock('../../hooks/useMetrics');

const mockTrackEvent = jest.fn();
const mockAddTraitsToUser = jest.fn();

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: mockAddTraitsToUser,
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

const Stack = createStackNavigator();

const renderComponent = (state: DeepPartial<RootState> = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.MODAL.NFT_AUTO_DETECTION_MODAL}>
        {() => <NFTAutoDetectionModal />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );
describe('NFT Auto detection modal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('render matches snapshot', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls setUseNftDetection and setDisplayNftMedia when clicking on allow button with nftDisplayMedia initially off', () => {
    const { getByTestId } = renderComponent({
      engine: {
        backgroundState: {
          PreferencesController: {
            displayNftMedia: false,
          },
        },
      },
    });
    const allowButton = getByTestId('allow');

    fireEvent.press(allowButton);
    expect(setUseNftDetectionSpy).toHaveBeenCalled();
    expect(setDisplayNftMediaSpy).toHaveBeenCalled();

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      'Enable OpenSea API': 'ON',
      'NFT Autodetection': 'ON',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NFT_AUTO_DETECTION_MODAL_ENABLE,
      )
        .addProperties({ chainId: '0x1' })
        .build(),
    );
  });

  it('calls setDisplayNftMedia when clicking on allow button if displayNftMedia if on', () => {
    const { getByTestId } = renderComponent(initialState);
    const allowButton = getByTestId('allow');

    fireEvent.press(allowButton);
    expect(setUseNftDetectionSpy).toHaveBeenCalled();
    expect(setDisplayNftMediaSpy).not.toHaveBeenCalled();

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      'NFT Autodetection': 'ON',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NFT_AUTO_DETECTION_MODAL_ENABLE,
      )
        .addProperties({ chainId: '0x1' })
        .build(),
    );
  });

  it('Does not call setUseNftDetection nor setDisplayNftMedia when clicking on not right now button', () => {
    const { getByTestId } = renderComponent(initialState);
    const cancelButton = getByTestId('cancel');

    fireEvent.press(cancelButton);
    expect(setUseNftDetectionSpy).not.toHaveBeenCalled();
    expect(setDisplayNftMediaSpy).not.toHaveBeenCalled();

    expect(mockAddTraitsToUser).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NFT_AUTO_DETECTION_MODAL_DISABLE,
      )
        .addProperties({ chainId: '0x1' })
        .build(),
    );
  });
});
