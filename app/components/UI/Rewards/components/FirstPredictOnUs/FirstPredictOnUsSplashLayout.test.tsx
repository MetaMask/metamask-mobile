import React from 'react';
import { useWindowDimensions } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { FirstPredictOnUsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import type { PredictMarket } from '../../../Predict/types';
import FirstPredictOnUsMarketsCarousel from './FirstPredictOnUsMarketsCarousel';
import RewardsThemeImageComponent from '../ThemeImageComponent/RewardsThemeImageComponent';
import FirstPredictOnUsSplashLayout from './FirstPredictOnUsSplashLayout';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../ThemeImageComponent/RewardsThemeImageComponent', () =>
  jest.fn(() => null),
);

jest.mock('./FirstPredictOnUsMarketsCarousel', () => jest.fn(() => null));

const mockRewardsThemeImageComponent =
  RewardsThemeImageComponent as jest.MockedFunction<
    typeof RewardsThemeImageComponent
  >;
const mockFirstPredictOnUsMarketsCarousel =
  FirstPredictOnUsMarketsCarousel as jest.MockedFunction<
    typeof FirstPredictOnUsMarketsCarousel
  >;

const markets = [{ id: '30615', outcomes: [] } as unknown as PredictMarket];

const buildContent = (
  overrides: Partial<FirstPredictOnUsDto> = {},
): FirstPredictOnUsDto => ({
  name: 'First Predict On Us',
  image: {
    lightModeUrl: 'https://images.example.com/light.png',
    darkModeUrl: 'https://images.example.com/dark.png',
  } as never,
  localizedText: {
    'splashSheet.skip': 'Skip',
    'splashSheet.description':
      'Make a $5 prediction on select sports markets and keep what you win.',
    'splashSheet.region': 'Availability varies by region.',
    'splashSheet.termsApply': 'Terms apply.',
    'tradeConfirm.confirm': 'Confirm trade',
  },
  usdAmount: 5,
  markets: [{ eventId: '30615', conditionId: '0xabc' }],
  termsUrl: 'https://example.com/terms',
  ...overrides,
});

describe('FirstPredictOnUsSplashLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  it('renders CMS splash copy from content props', () => {
    const content = buildContent();

    const { getByTestId } = render(
      <FirstPredictOnUsSplashLayout
        content={content}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(getByTestId('first-predict-on-us-splash')).toBeOnTheScreen();
    expect(getByTestId('first-predict-on-us-splash-skip')).toHaveTextContent(
      content.localizedText['splashSheet.skip'],
    );
    expect(
      getByTestId('first-predict-on-us-splash-description'),
    ).toHaveTextContent(content.localizedText['splashSheet.description']);
    expect(
      getByTestId('first-predict-on-us-splash-legal-footer'),
    ).toBeOnTheScreen();
  });

  it('invokes onSkip when the skip control is pressed', () => {
    const onSkip = jest.fn();

    const { getByTestId } = render(
      <FirstPredictOnUsSplashLayout
        content={buildContent()}
        markets={markets}
        onSkip={onSkip}
      />,
    );

    fireEvent.press(getByTestId('first-predict-on-us-splash-skip'));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('passes carousel props from CMS content and resolved markets', () => {
    const content = buildContent();

    render(
      <FirstPredictOnUsSplashLayout
        content={content}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(mockFirstPredictOnUsMarketsCarousel).toHaveBeenCalledWith(
      {
        confirmLabel: content.localizedText['tradeConfirm.confirm'],
        markets,
        usdAmount: content.usdAmount,
      },
      undefined,
    );
  });

  it('renders the hero image with the default height on larger screens', () => {
    render(
      <FirstPredictOnUsSplashLayout
        content={buildContent()}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(mockRewardsThemeImageComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.arrayContaining([
          expect.objectContaining({ height: 320 }),
        ]),
      }),
      undefined,
    );
  });

  it('renders the hero image with a compact height on small screens', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: 699,
      scale: 2,
      fontScale: 1,
    });

    render(
      <FirstPredictOnUsSplashLayout
        content={buildContent()}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(mockRewardsThemeImageComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.arrayContaining([
          expect.objectContaining({ height: 200 }),
        ]),
      }),
      undefined,
    );
  });

  it('omits the hero image when CMS content has no image', () => {
    render(
      <FirstPredictOnUsSplashLayout
        content={buildContent({ image: null })}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(mockRewardsThemeImageComponent).not.toHaveBeenCalled();
  });

  it('falls back to localized strings when CMS copy keys are missing', () => {
    const { getByTestId } = render(
      <FirstPredictOnUsSplashLayout
        content={buildContent({ localizedText: {} })}
        markets={markets}
        onSkip={jest.fn()}
      />,
    );

    expect(getByTestId('first-predict-on-us-splash-skip')).toHaveTextContent(
      strings('rewards.first_predict_on_us.splash.skip'),
    );
    expect(mockFirstPredictOnUsMarketsCarousel).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmLabel: strings(
          'rewards.first_predict_on_us.trade_confirm.confirm',
        ),
      }),
      undefined,
    );
  });
});
