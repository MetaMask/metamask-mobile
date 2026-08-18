import React from 'react';
import { Text } from 'react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import { UiSlotRenderer } from './UiSlotRenderer';

jest.mock('./mobileActionRegistry', () => ({
  executeUiSlotAction: jest.fn(),
}));

const mockMarketCarouselWidget = jest.fn(() => null);

jest.mock('../Predict/uiSlots/widgets/MarketCarouselWidget', () => ({
  MarketCarouselWidget: () => mockMarketCarouselWidget(),
}));
jest.mock('../../../util/Logger');

const createState = (
  widgetType = 'alert-banner',
  hasActiveConfiguration = true,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      UiSlotsController: {
        enabled: true,
        screenConfigurations: {},
        requestStatus: { 'predict-home': 'ready' },
        dismissedContentIds: {},
        activeConfigurationKeys: hasActiveConfiguration
          ? { 'predict-home': 'predict-home-key' }
          : {},
        renderedConfigurations: hasActiveConfiguration
          ? {
              'predict-home-key': {
                slotIds: ['predict-home.before-portfolio'],
                slotsById: {
                  'predict-home.before-portfolio': {
                    slotId: 'predict-home.before-portfolio',
                    contentId: 'banner-1',
                    revision: 1,
                    widget:
                      widgetType === 'alert-banner'
                        ? {
                            type: 'alert-banner',
                            schemaVersion: 1,
                            props: {
                              tone: 'info',
                              title: 'UI Slots title',
                              description: 'UI Slots description',
                            },
                          }
                        : ({
                            type: widgetType,
                            schemaVersion: 1,
                            props: {},
                          } as never),
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
  it('renders the registered widget selected by slot ID', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.before-portfolio"
      />,
      { state: createState() },
    );

    expect(getByText('UI Slots title')).toBeOnTheScreen();
    expect(getByText('UI Slots description')).toBeOnTheScreen();
  });

  it('renders fallback when no compatible configuration is active', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.missing"
        fallback={<Text>Legacy content</Text>}
      />,
      { state: createState('alert-banner', false) },
    );

    expect(getByText('Legacy content')).toBeOnTheScreen();
  });

  it('renders nothing when the active configuration leaves a slot empty', () => {
    const { queryByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.missing"
        fallback={<Text>Legacy content</Text>}
      />,
      { state: createState() },
    );

    expect(queryByText('Legacy content')).toBeNull();
  });

  it('renders fallback immediately when basic functionality is disabled', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.before-portfolio"
        fallback={<Text>Legacy content</Text>}
      />,
      {
        state: {
          ...createState(),
          settings: { basicFunctionalityEnabled: false },
        },
      },
    );

    expect(getByText('Legacy content')).toBeOnTheScreen();
  });

  it('renders fallback for an unregistered widget type', () => {
    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.before-portfolio"
        fallback={<Text>Safe fallback</Text>}
      />,
      { state: createState('future-widget') },
    );

    expect(getByText('Safe fallback')).toBeOnTheScreen();
  });

  it('isolates widget render failures and renders fallback', () => {
    mockMarketCarouselWidget.mockImplementation(() => {
      throw new Error('Widget failed');
    });

    const { getByText } = renderWithProvider(
      <UiSlotRenderer
        screenId="predict-home"
        slotId="predict-home.before-portfolio"
        fallback={<Text>Safe fallback</Text>}
      />,
      { state: createState('market-carousel') },
    );

    expect(mockMarketCarouselWidget).toHaveBeenCalled();
    expect(getByText('Safe fallback')).toBeOnTheScreen();
  });
});
