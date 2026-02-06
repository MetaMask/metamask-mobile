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
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      mockRouteParams,
    );

    // Assert
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(/Convert your stablecoins to mUSD.*receive up to a \d+% bonus/),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('earn.musd_conversion.education.primary_button')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('earn.musd_conversion.education.secondary_button')),
    ).toBeOnTheScreen();
  });

  it('renders education screen heading', () => {
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      mockRouteParams,
    );

    // Assert
    // Verify screen renders with heading
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('keeps go back button visible after press', async () => {
    // Arrange
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
      },
      mockRouteParams,
    );

    const goBackButton = getByText(
      strings('earn.musd_conversion.education.secondary_button'),
    );

    // Act
    await act(async () => {
      fireEvent.press(goBackButton);
    });

    // Assert
    // Button should still be on screen after press
    expect(goBackButton).toBeOnTheScreen();
  });

  it('keeps continue button visible after press when education not seen', async () => {
    // Arrange
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
      },
      mockRouteParams,
    );

    const continueButton = getByText(
      strings('earn.musd_conversion.education.primary_button'),
    );

    // Act
    await act(async () => {
      fireEvent.press(continueButton);
    });

    // Assert
    expect(continueButton).toBeOnTheScreen();
  });

  it('renders screen when route params are missing', () => {
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      {}, // Missing params
    );

    // Assert
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
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      {
        preferredPaymentToken: mockRouteParams.preferredPaymentToken,
        // Missing outputChainId
      },
    );

    // Assert
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
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      {
        outputChainId: mockRouteParams.outputChainId,
        // Missing preferredPaymentToken
      },
    );

    // Assert
    // Component should still render
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders education screen with correct APY percentage in heading', () => {
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      mockRouteParams,
    );

    // Assert
    const heading = getByText(
      strings('earn.musd_conversion.education.heading', {
        percentage: MUSD_CONVERSION_APY,
      }),
    );
    expect(heading).toBeOnTheScreen();
    expect(heading.props.children).toContain(`${MUSD_CONVERSION_APY}%`);
  });

  it('renders education screen with correct APY percentage in description', () => {
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      mockRouteParams,
    );

    // Assert
    const description = getByText(
      /Convert your stablecoins to mUSD.*receive up to a \d+% bonus/,
    );
    expect(description).toBeOnTheScreen();
    expect(description.props.children[0]).toContain(`${MUSD_CONVERSION_APY}%`);
  });

  it('renders education screen when education has been seen', () => {
    // Arrange
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
          musdConversionEducationSeen: true,
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      mockRouteParams,
    );

    // Assert
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders education screen with all route params provided', () => {
    // Arrange
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

    // Act
    const { getByText } = renderScreenWithRoutes(
      EarnMusdConversionEducationView as unknown as React.ComponentType,
      { name: Routes.EARN.MUSD.CONVERSION_EDUCATION },
      [],
      {
        state,
      },
      {
        preferredPaymentToken: mockRouteParams.preferredPaymentToken,
        outputChainId: mockRouteParams.outputChainId,
      },
    );

    // Assert
    expect(
      getByText(
        strings('earn.musd_conversion.education.heading', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });
});
