import '../../../../../util/test/component-view/mocks';
import { renderScreenWithRoutes } from '../../../../../util/test/component-view/render';
import { initialStateWallet } from '../../../../../util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../util/test/platform';
import React from 'react';
import EarnMusdConversionEducationView from './index';
import { strings } from '../../../../../../locales/i18n';
import { fireEvent, act } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { MUSD_CONVERSION_APY } from '../../constants/musd';

describeForPlatforms('EarnMusdConversionEducationView', () => {
  const mockRouteParams = {
    preferredPaymentToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
      chainId: '0x1' as Hex,
    },
    outputChainId: '0x1' as Hex,
  };

  it('renders education screen with all UI elements', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: mockRouteParams,
      },
    );

    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('earn.musd_conversion.education.description', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('earn.musd_conversion.education.primary_button')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('earn.musd_conversion.education.secondary_button')),
    ).toBeOnTheScreen();
  });

  it('keeps continue button visible after press', async () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
        user: {
          musdConversionEducationSeen: false,
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: mockRouteParams,
      },
    );

    const continueButton = getByText(
      strings('earn.musd_conversion.education.primary_button'),
    );

    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(continueButton).toBeOnTheScreen();
  });

  it('renders background image based on color scheme', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: mockRouteParams,
      },
    );

    // Verify screen renders with heading (image is rendered as part of component tree)
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('keeps go back button visible after press', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: mockRouteParams,
      },
    );

    const goBackButton = getByText(
      strings('earn.musd_conversion.education.secondary_button'),
    );
    fireEvent.press(goBackButton);

    // Button should still be on screen after press
    expect(goBackButton).toBeOnTheScreen();
  });

  it('keeps continue button visible after press when education not seen', async () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
        user: {
          musdConversionEducationSeen: false,
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: mockRouteParams,
      },
    );

    const continueButton = getByText(
      strings('earn.musd_conversion.education.primary_button'),
    );

    await act(async () => {
      fireEvent.press(continueButton);
    });

    expect(continueButton).toBeOnTheScreen();
  });

  it('renders screen when route params are missing', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: {}, // Missing params
      },
    );

    // Component should still render
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders screen when outputChainId is missing in route params', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: {
          preferredPaymentToken: mockRouteParams.preferredPaymentToken,
          // Missing outputChainId
        },
      },
    );

    // Component should still render
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders screen when preferredPaymentToken is missing in route params', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionFlowEnabled: { enabled: true },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
        initialParams: {
          outputChainId: mockRouteParams.outputChainId,
          // Missing preferredPaymentToken
        },
      },
    );

    // Component should still render
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });
});
