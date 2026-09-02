import React from 'react';
import { Text } from 'react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { UiSlotRenderer } from './UiSlotRenderer';

const mockPredictDiscoveryListWidget = jest.fn(() => (
  <Text>Remote discovery</Text>
));

jest.mock('../Predict/uiSlots/widgets/PredictDiscoveryListWidget', () => ({
  PredictDiscoveryListWidget: () => mockPredictDiscoveryListWidget(),
}));
jest.mock('../../../util/Logger');

const createState = ({
  hasActiveConfiguration = true,
  widgetType = 'predict-discovery-list',
}: {
  hasActiveConfiguration?: boolean;
  widgetType?: string;
} = {}): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      UiSlotsController: {
        enabled: true,
        screenConfigurations: {},
        requestStatus: { 'wallet-home': 'ready' },
        activeConfigurationKeys: hasActiveConfiguration
          ? { 'wallet-home': 'wallet-home-key' }
          : {},
        renderedConfigurations: hasActiveConfiguration
          ? {
              'wallet-home-key': {
                slotIds: ['wallet-home.predict-empty-state'],
                slotsById: {
                  'wallet-home.predict-empty-state': {
                    slotId: 'wallet-home.predict-empty-state',
                    contentId: 'predict-empty-state-1',
                    revision: 1,
                    widget: {
                      type: widgetType,
                      schemaVersion: 1,
                      props: {},
                    } as never,
                    dataReferences: [
                      {
                        id: 'markets',
                        type: 'predict-homepage-market-slots',
                        params: {
                          venue: 'polymarket',
                          items: [
                            {
                              type: 'series',
                              seriesId: 'btc-up-or-down-5m',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {},
      },
    },
  },
});

describe('UiSlotRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPredictDiscoveryListWidget.mockImplementation(() => (
      <Text>Remote discovery</Text>
    ));
  });

  it('renders the registered Wallet Predict widget', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.predict-empty-state"
      />,
      { state: createState() },
    );

    expect(getByText('Remote discovery')).toBeOnTheScreen();
  });

  it('renders fallback when no compatible configuration is active', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.predict-empty-state"
        fallback={<Text>Bundled discovery</Text>}
      />,
      { state: createState({ hasActiveConfiguration: false }) },
    );

    expect(getByText('Bundled discovery')).toBeOnTheScreen();
  });

  it('renders nothing when the active configuration leaves a slot empty', () => {
    const { queryByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.missing"
        fallback={<Text>Bundled discovery</Text>}
      />,
      { state: createState() },
    );

    expect(queryByText('Bundled discovery')).toBeNull();
  });

  it('renders fallback for an empty resolution when requested by the host', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.missing"
        fallback={<Text>Bundled discovery</Text>}
        fallbackOnEmpty
      />,
      { state: createState() },
    );

    expect(getByText('Bundled discovery')).toBeOnTheScreen();
  });

  it('renders fallback immediately when basic functionality is disabled', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.predict-empty-state"
        fallback={<Text>Bundled discovery</Text>}
      />,
      {
        state: {
          ...createState(),
          settings: { basicFunctionalityEnabled: false },
        },
      },
    );

    expect(getByText('Bundled discovery')).toBeOnTheScreen();
  });

  it('renders fallback for an unregistered widget type', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.predict-empty-state"
        fallback={<Text>Bundled discovery</Text>}
      />,
      { state: createState({ widgetType: 'future-widget' }) },
    );

    expect(getByText('Bundled discovery')).toBeOnTheScreen();
  });

  it('isolates widget render failures and renders fallback', () => {
    mockPredictDiscoveryListWidget.mockImplementation(() => {
      throw new Error('Widget failed');
    });

    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="wallet-home"
        slotId="wallet-home.predict-empty-state"
        fallback={<Text>Bundled discovery</Text>}
      />,
      { state: createState() },
    );

    expect(mockPredictDiscoveryListWidget).toHaveBeenCalled();
    expect(getByText('Bundled discovery')).toBeOnTheScreen();
  });
});
