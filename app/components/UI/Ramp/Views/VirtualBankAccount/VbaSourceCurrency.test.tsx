/* eslint-disable @metamask/design-tokens/color-no-hex */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSourceCurrency, {
  VbaSourceCurrencySelectorsIDs,
} from './VbaSourceCurrency';

const mockNavigate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => '0xabc',
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      registerMoneyAccountWallet: (...args: unknown[]) =>
        mockRegisterWallet(...args),
      createAutoramp: (...args: unknown[]) => mockCreateAutoramp(...args),
    },
  },
}));

describe('VbaSourceCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegisterWallet.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreateAutoramp.mockResolvedValue({
      id: 'autoramp-1',
      status: 'Created',
    });
  });

  it('renders the currency choice', () => {
    const { toJSON } = renderWithProvider(<VbaSourceCurrency />);

    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        edges={
          [
            "right",
            "bottom",
            "left",
          ]
        }
        style={
          {
            "backgroundColor": "#ffffff",
            "flexBasis": "0%",
            "flexGrow": 1,
            "flexShrink": 1,
          }
        }
      >
        <View
          style={
            [
              {
                "alignItems": "center",
                "flexDirection": "row",
                "gap": 16,
                "height": 56,
                "paddingLeft": 8,
                "paddingRight": 8,
              },
              {
                "marginTop": 0,
              },
              undefined,
            ]
          }
        >
          <View>
            <View
              onLayout={[Function]}
            >
              <View
                accessibilityState={
                  {
                    "busy": undefined,
                    "checked": undefined,
                    "disabled": false,
                    "expanded": undefined,
                    "selected": undefined,
                  }
                }
                accessibilityValue={
                  {
                    "max": undefined,
                    "min": undefined,
                    "now": undefined,
                    "text": undefined,
                  }
                }
                accessible={true}
                collapsable={false}
                focusable={true}
                jestAnimatedProps={
                  {
                    "value": {},
                  }
                }
                jestAnimatedStyle={
                  {
                    "value": {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  }
                }
                jestInlineStyle={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "transparent",
                      "borderRadius": 9999,
                      "height": 32,
                      "justifyContent": "center",
                      "opacity": 1,
                      "width": 32,
                    },
                    undefined,
                  ]
                }
                onBlur={[Function]}
                onClick={[Function]}
                onFocus={[Function]}
                onResponderGrant={[Function]}
                onResponderMove={[Function]}
                onResponderRelease={[Function]}
                onResponderTerminate={[Function]}
                onResponderTerminationRequest={[Function]}
                onStartShouldSetResponder={[Function]}
                style={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "transparent",
                      "borderRadius": 9999,
                      "height": 32,
                      "justifyContent": "center",
                      "opacity": 1,
                      "width": 32,
                    },
                    undefined,
                    {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  ]
                }
                testID="button-icon"
              >
                <SvgMock
                  fill="currentColor"
                  name="ArrowLeft"
                  style={
                    {
                      "color": "#131416",
                      "height": 24,
                      "width": 24,
                    }
                  }
                />
              </View>
            </View>
          </View>
          <View
            style={
              {
                "alignItems": "center",
                "flexBasis": "0%",
                "flexGrow": 1,
                "flexShrink": 1,
              }
            }
          />
          <View>
            <View
              onLayout={[Function]}
            />
          </View>
        </View>
        <RCTScrollView
          contentContainerStyle={
            {
              "flexGrow": 1,
              "paddingBottom": 16,
              "paddingLeft": 16,
              "paddingRight": 16,
            }
          }
          testID="vba-source-currency-container"
        >
          <View>
            <Text
              accessibilityRole="text"
              style={
                [
                  {
                    "color": "#131416",
                    "fontFamily": "Inter-SemiBold",
                    "fontSize": 24,
                    "letterSpacing": 0,
                    "lineHeight": 32,
                    "marginTop": 8,
                  },
                  undefined,
                ]
              }
            >
              Choose a currency
            </Text>
            <Text
              accessibilityRole="text"
              style={
                [
                  {
                    "color": "#66676a",
                    "fontFamily": "Inter-Regular",
                    "fontSize": 16,
                    "letterSpacing": 0,
                    "lineHeight": 24,
                    "marginBottom": 16,
                    "marginTop": 8,
                  },
                  undefined,
                ]
              }
            >
              Your identity is verified. Choose the currency you will deposit.
            </Text>
            <View
              style={
                [
                  {
                    "display": "flex",
                    "gap": 12,
                  },
                  undefined,
                ]
              }
            >
              <View
                accessibilityLabel="USD"
                accessibilityRole="button"
                accessibilityState={
                  {
                    "busy": undefined,
                    "checked": undefined,
                    "disabled": false,
                    "expanded": undefined,
                    "selected": undefined,
                  }
                }
                accessibilityValue={
                  {
                    "max": undefined,
                    "min": undefined,
                    "now": undefined,
                    "text": undefined,
                  }
                }
                accessible={true}
                collapsable={false}
                focusable={true}
                jestAnimatedProps={
                  {
                    "value": {},
                  }
                }
                jestAnimatedStyle={
                  {
                    "value": {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  }
                }
                jestInlineStyle={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "#b4b4b528",
                      "borderColor": "transparent",
                      "borderRadius": 9999,
                      "borderWidth": 1,
                      "flexDirection": "row",
                      "height": 48,
                      "justifyContent": "center",
                      "opacity": 1,
                      "overflow": "hidden",
                      "paddingLeft": 16,
                      "paddingRight": 16,
                      "width": "100%",
                    },
                  ]
                }
                onBlur={[Function]}
                onClick={[Function]}
                onFocus={[Function]}
                onResponderGrant={[Function]}
                onResponderMove={[Function]}
                onResponderRelease={[Function]}
                onResponderTerminate={[Function]}
                onResponderTerminationRequest={[Function]}
                onStartShouldSetResponder={[Function]}
                style={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "#b4b4b528",
                      "borderColor": "transparent",
                      "borderRadius": 9999,
                      "borderWidth": 1,
                      "flexDirection": "row",
                      "height": 48,
                      "justifyContent": "center",
                      "opacity": 1,
                      "overflow": "hidden",
                      "paddingLeft": 16,
                      "paddingRight": 16,
                      "width": "100%",
                    },
                    {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  ]
                }
                testID="vba-source-currency-usd-button"
              >
                <View
                  style={
                    [
                      {
                        "alignItems": "center",
                        "display": "flex",
                        "flexDirection": "row",
                        "gap": 0,
                      },
                      undefined,
                    ]
                  }
                >
                  <Text
                    accessibilityRole="text"
                    ellipsizeMode="clip"
                    numberOfLines={1}
                    style={
                      [
                        {
                          "color": "#131416",
                          "flexGrow": 0,
                          "flexShrink": 1,
                          "flexWrap": "wrap",
                          "fontFamily": "Inter-Medium",
                          "fontSize": 16,
                          "letterSpacing": 0,
                          "lineHeight": 24,
                          "textAlign": "center",
                        },
                        undefined,
                      ]
                    }
                  >
                    USD
                  </Text>
                </View>
              </View>
              <View
                accessibilityLabel="BRL"
                accessibilityRole="button"
                accessibilityState={
                  {
                    "busy": undefined,
                    "checked": undefined,
                    "disabled": false,
                    "expanded": undefined,
                    "selected": undefined,
                  }
                }
                accessibilityValue={
                  {
                    "max": undefined,
                    "min": undefined,
                    "now": undefined,
                    "text": undefined,
                  }
                }
                accessible={true}
                collapsable={false}
                focusable={true}
                jestAnimatedProps={
                  {
                    "value": {},
                  }
                }
                jestAnimatedStyle={
                  {
                    "value": {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  }
                }
                jestInlineStyle={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "#b4b4b528",
                      "borderColor": "transparent",
                      "borderRadius": 9999,
                      "borderWidth": 1,
                      "flexDirection": "row",
                      "height": 48,
                      "justifyContent": "center",
                      "opacity": 1,
                      "overflow": "hidden",
                      "paddingLeft": 16,
                      "paddingRight": 16,
                      "width": "100%",
                    },
                  ]
                }
                onBlur={[Function]}
                onClick={[Function]}
                onFocus={[Function]}
                onResponderGrant={[Function]}
                onResponderMove={[Function]}
                onResponderRelease={[Function]}
                onResponderTerminate={[Function]}
                onResponderTerminationRequest={[Function]}
                onStartShouldSetResponder={[Function]}
                style={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "#b4b4b528",
                      "borderColor": "transparent",
                      "borderRadius": 9999,
                      "borderWidth": 1,
                      "flexDirection": "row",
                      "height": 48,
                      "justifyContent": "center",
                      "opacity": 1,
                      "overflow": "hidden",
                      "paddingLeft": 16,
                      "paddingRight": 16,
                      "width": "100%",
                    },
                    {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  ]
                }
                testID="vba-source-currency-brl-button"
              >
                <View
                  style={
                    [
                      {
                        "alignItems": "center",
                        "display": "flex",
                        "flexDirection": "row",
                        "gap": 0,
                      },
                      undefined,
                    ]
                  }
                >
                  <Text
                    accessibilityRole="text"
                    ellipsizeMode="clip"
                    numberOfLines={1}
                    style={
                      [
                        {
                          "color": "#131416",
                          "flexGrow": 0,
                          "flexShrink": 1,
                          "flexWrap": "wrap",
                          "fontFamily": "Inter-Medium",
                          "fontSize": 16,
                          "letterSpacing": 0,
                          "lineHeight": 24,
                          "textAlign": "center",
                        },
                        undefined,
                      ]
                    }
                  >
                    BRL
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
        <View
          style={
            [
              {
                "display": "flex",
                "gap": 12,
                "paddingBottom": 16,
                "paddingLeft": 16,
                "paddingRight": 16,
                "paddingTop": 16,
              },
              undefined,
            ]
          }
        >
          <View
            accessibilityLabel="Continue"
            accessibilityRole="button"
            accessibilityState={
              {
                "busy": undefined,
                "checked": undefined,
                "disabled": true,
                "expanded": undefined,
                "selected": undefined,
              }
            }
            accessibilityValue={
              {
                "max": undefined,
                "min": undefined,
                "now": undefined,
                "text": undefined,
              }
            }
            accessible={true}
            collapsable={false}
            focusable={true}
            jestAnimatedProps={
              {
                "value": {},
              }
            }
            jestAnimatedStyle={
              {
                "value": {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              }
            }
            jestInlineStyle={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#131416",
                  "borderRadius": 9999,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 0.5,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
              ]
            }
            onBlur={[Function]}
            onClick={[Function]}
            onFocus={[Function]}
            onResponderGrant={[Function]}
            onResponderMove={[Function]}
            onResponderRelease={[Function]}
            onResponderTerminate={[Function]}
            onResponderTerminationRequest={[Function]}
            onStartShouldSetResponder={[Function]}
            style={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#131416",
                  "borderRadius": 9999,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 0.5,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
                {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              ]
            }
            testID="vba-source-currency-continue-button"
          >
            <View
              style={
                [
                  {
                    "alignItems": "center",
                    "display": "flex",
                    "flexDirection": "row",
                    "gap": 0,
                  },
                  undefined,
                ]
              }
            >
              <Text
                accessibilityRole="text"
                ellipsizeMode="clip"
                numberOfLines={1}
                style={
                  [
                    {
                      "color": "#ffffff",
                      "flexGrow": 0,
                      "flexShrink": 1,
                      "flexWrap": "wrap",
                      "fontFamily": "Inter-Medium",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                      "textAlign": "center",
                    },
                    undefined,
                  ]
                }
              >
                Continue
              </Text>
            </View>
          </View>
        </View>
      </View>
    `);
  });

  it('creates the autoramp for the chosen currency and shows its details', async () => {
    const { getByTestId, toJSON } = renderWithProvider(<VbaSourceCurrency />);

    fireEvent.press(getByTestId(VbaSourceCurrencySelectorsIDs.BRL_BUTTON));
    fireEvent.press(getByTestId(VbaSourceCurrencySelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(getByTestId(VbaSourceCurrencySelectorsIDs.CREATED)).toBeTruthy();
    });

    expect(mockRegisterWallet).toHaveBeenCalledWith({ address: '0xabc' });
    expect(mockCreateAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'BRL' }],
      }),
    );
    expect(toJSON()).toMatchInlineSnapshot(`
      <View
        edges={
          [
            "right",
            "bottom",
            "left",
          ]
        }
        style={
          {
            "backgroundColor": "#ffffff",
            "flexBasis": "0%",
            "flexGrow": 1,
            "flexShrink": 1,
          }
        }
      >
        <View
          style={
            [
              {
                "alignItems": "center",
                "flexDirection": "row",
                "gap": 16,
                "height": 56,
                "paddingLeft": 8,
                "paddingRight": 8,
              },
              {
                "marginTop": 0,
              },
              undefined,
            ]
          }
        >
          <View>
            <View
              onLayout={[Function]}
            >
              <View
                accessibilityState={
                  {
                    "busy": undefined,
                    "checked": undefined,
                    "disabled": false,
                    "expanded": undefined,
                    "selected": undefined,
                  }
                }
                accessibilityValue={
                  {
                    "max": undefined,
                    "min": undefined,
                    "now": undefined,
                    "text": undefined,
                  }
                }
                accessible={true}
                collapsable={false}
                focusable={true}
                jestAnimatedProps={
                  {
                    "value": {},
                  }
                }
                jestAnimatedStyle={
                  {
                    "value": {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  }
                }
                jestInlineStyle={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "transparent",
                      "borderRadius": 9999,
                      "height": 32,
                      "justifyContent": "center",
                      "opacity": 1,
                      "width": 32,
                    },
                    undefined,
                  ]
                }
                onBlur={[Function]}
                onClick={[Function]}
                onFocus={[Function]}
                onResponderGrant={[Function]}
                onResponderMove={[Function]}
                onResponderRelease={[Function]}
                onResponderTerminate={[Function]}
                onResponderTerminationRequest={[Function]}
                onStartShouldSetResponder={[Function]}
                style={
                  [
                    {
                      "alignItems": "center",
                      "backgroundColor": "transparent",
                      "borderRadius": 9999,
                      "height": 32,
                      "justifyContent": "center",
                      "opacity": 1,
                      "width": 32,
                    },
                    undefined,
                    {
                      "transform": [
                        {
                          "scale": 1,
                        },
                      ],
                    },
                  ]
                }
                testID="button-icon"
              >
                <SvgMock
                  fill="currentColor"
                  name="ArrowLeft"
                  style={
                    {
                      "color": "#131416",
                      "height": 24,
                      "width": 24,
                    }
                  }
                />
              </View>
            </View>
          </View>
          <View
            style={
              {
                "alignItems": "center",
                "flexBasis": "0%",
                "flexGrow": 1,
                "flexShrink": 1,
              }
            }
          />
          <View>
            <View
              onLayout={[Function]}
            />
          </View>
        </View>
        <RCTScrollView
          contentContainerStyle={
            {
              "flexGrow": 1,
              "paddingBottom": 16,
              "paddingLeft": 16,
              "paddingRight": 16,
            }
          }
          testID="vba-source-currency-container"
        >
          <View>
            <View
              style={
                [
                  {
                    "display": "flex",
                  },
                  undefined,
                ]
              }
              testID="vba-source-currency-created"
            >
              <Text
                accessibilityRole="text"
                style={
                  [
                    {
                      "color": "#131416",
                      "fontFamily": "Inter-SemiBold",
                      "fontSize": 24,
                      "letterSpacing": 0,
                      "lineHeight": 32,
                      "marginTop": 8,
                    },
                    undefined,
                  ]
                }
              >
                Deposit route ready
              </Text>
              <Text
                accessibilityRole="text"
                style={
                  [
                    {
                      "color": "#66676a",
                      "fontFamily": "Inter-Regular",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                      "marginBottom": 16,
                      "marginTop": 8,
                    },
                    undefined,
                  ]
                }
              >
                Deposits in this currency convert to mUSD on your Money Account.
              </Text>
              <View
                style={
                  {
                    "flexDirection": "row",
                    "justifyContent": "space-between",
                  }
                }
              >
                <Text
                  accessibilityRole="text"
                  style={
                    {
                      "color": "#131416",
                      "fontFamily": "Inter-Regular",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                    }
                  }
                >
                  Currency
                </Text>
                <View
                  style={
                    {
                      "alignItems": "center",
                      "flex": 1,
                      "flexDirection": "row",
                      "gap": 8,
                      "justifyContent": "flex-end",
                      "marginLeft": 16,
                    }
                  }
                >
                  <Text
                    accessibilityRole="text"
                    style={
                      {
                        "color": "#66676a",
                        "flex": 1,
                        "flexWrap": "wrap",
                        "fontFamily": "Inter-Regular",
                        "fontSize": 16,
                        "letterSpacing": 0,
                        "lineHeight": 24,
                        "textAlign": "right",
                      }
                    }
                  >
                    BRL
                  </Text>
                  <View
                    accessibilityState={
                      {
                        "busy": undefined,
                        "checked": undefined,
                        "disabled": undefined,
                        "expanded": undefined,
                        "selected": undefined,
                      }
                    }
                    accessibilityValue={
                      {
                        "max": undefined,
                        "min": undefined,
                        "now": undefined,
                        "text": undefined,
                      }
                    }
                    accessible={true}
                    collapsable={false}
                    focusable={true}
                    onClick={[Function]}
                    onResponderGrant={[Function]}
                    onResponderMove={[Function]}
                    onResponderRelease={[Function]}
                    onResponderTerminate={[Function]}
                    onResponderTerminationRequest={[Function]}
                    onStartShouldSetResponder={[Function]}
                    style={
                      {
                        "opacity": 1,
                      }
                    }
                    testID="copy-button"
                  >
                    <SvgMock
                      color="#66676a"
                      fill="currentColor"
                      height={16}
                      name="Copy"
                      style={
                        {
                          "height": 16,
                          "width": 16,
                        }
                      }
                      width={16}
                    />
                  </View>
                </View>
              </View>
              <View
                style={
                  {
                    "flexDirection": "row",
                    "justifyContent": "space-between",
                  }
                }
              >
                <Text
                  accessibilityRole="text"
                  style={
                    {
                      "color": "#131416",
                      "fontFamily": "Inter-Regular",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                    }
                  }
                >
                  Route id
                </Text>
                <View
                  style={
                    {
                      "alignItems": "center",
                      "flex": 1,
                      "flexDirection": "row",
                      "gap": 8,
                      "justifyContent": "flex-end",
                      "marginLeft": 16,
                    }
                  }
                >
                  <Text
                    accessibilityRole="text"
                    style={
                      {
                        "color": "#66676a",
                        "flex": 1,
                        "flexWrap": "wrap",
                        "fontFamily": "Inter-Regular",
                        "fontSize": 16,
                        "letterSpacing": 0,
                        "lineHeight": 24,
                        "textAlign": "right",
                      }
                    }
                  >
                    autoramp-1
                  </Text>
                  <View
                    accessibilityState={
                      {
                        "busy": undefined,
                        "checked": undefined,
                        "disabled": undefined,
                        "expanded": undefined,
                        "selected": undefined,
                      }
                    }
                    accessibilityValue={
                      {
                        "max": undefined,
                        "min": undefined,
                        "now": undefined,
                        "text": undefined,
                      }
                    }
                    accessible={true}
                    collapsable={false}
                    focusable={true}
                    onClick={[Function]}
                    onResponderGrant={[Function]}
                    onResponderMove={[Function]}
                    onResponderRelease={[Function]}
                    onResponderTerminate={[Function]}
                    onResponderTerminationRequest={[Function]}
                    onStartShouldSetResponder={[Function]}
                    style={
                      {
                        "opacity": 1,
                      }
                    }
                    testID="copy-button"
                  >
                    <SvgMock
                      color="#66676a"
                      fill="currentColor"
                      height={16}
                      name="Copy"
                      style={
                        {
                          "height": 16,
                          "width": 16,
                        }
                      }
                      width={16}
                    />
                  </View>
                </View>
              </View>
              <View
                style={
                  {
                    "flexDirection": "row",
                    "justifyContent": "space-between",
                  }
                }
              >
                <Text
                  accessibilityRole="text"
                  style={
                    {
                      "color": "#131416",
                      "fontFamily": "Inter-Regular",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                    }
                  }
                >
                  Status
                </Text>
                <View
                  style={
                    {
                      "alignItems": "center",
                      "flex": 1,
                      "flexDirection": "row",
                      "gap": 8,
                      "justifyContent": "flex-end",
                      "marginLeft": 16,
                    }
                  }
                >
                  <Text
                    accessibilityRole="text"
                    style={
                      {
                        "color": "#66676a",
                        "flex": 1,
                        "flexWrap": "wrap",
                        "fontFamily": "Inter-Regular",
                        "fontSize": 16,
                        "letterSpacing": 0,
                        "lineHeight": 24,
                        "textAlign": "right",
                      }
                    }
                  >
                    Created
                  </Text>
                  <View
                    accessibilityState={
                      {
                        "busy": undefined,
                        "checked": undefined,
                        "disabled": undefined,
                        "expanded": undefined,
                        "selected": undefined,
                      }
                    }
                    accessibilityValue={
                      {
                        "max": undefined,
                        "min": undefined,
                        "now": undefined,
                        "text": undefined,
                      }
                    }
                    accessible={true}
                    collapsable={false}
                    focusable={true}
                    onClick={[Function]}
                    onResponderGrant={[Function]}
                    onResponderMove={[Function]}
                    onResponderRelease={[Function]}
                    onResponderTerminate={[Function]}
                    onResponderTerminationRequest={[Function]}
                    onStartShouldSetResponder={[Function]}
                    style={
                      {
                        "opacity": 1,
                      }
                    }
                    testID="copy-button"
                  >
                    <SvgMock
                      color="#66676a"
                      fill="currentColor"
                      height={16}
                      name="Copy"
                      style={
                        {
                          "height": 16,
                          "width": 16,
                        }
                      }
                      width={16}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
        <View
          style={
            [
              {
                "display": "flex",
                "gap": 12,
                "paddingBottom": 16,
                "paddingLeft": 16,
                "paddingRight": 16,
                "paddingTop": 16,
              },
              undefined,
            ]
          }
        >
          <View
            accessibilityLabel="View PIX instructions"
            accessibilityRole="button"
            accessibilityState={
              {
                "busy": undefined,
                "checked": undefined,
                "disabled": false,
                "expanded": undefined,
                "selected": undefined,
              }
            }
            accessibilityValue={
              {
                "max": undefined,
                "min": undefined,
                "now": undefined,
                "text": undefined,
              }
            }
            accessible={true}
            collapsable={false}
            focusable={true}
            jestAnimatedProps={
              {
                "value": {},
              }
            }
            jestAnimatedStyle={
              {
                "value": {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              }
            }
            jestInlineStyle={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#b4b4b528",
                  "borderColor": "transparent",
                  "borderRadius": 9999,
                  "borderWidth": 1,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 1,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
              ]
            }
            onBlur={[Function]}
            onClick={[Function]}
            onFocus={[Function]}
            onResponderGrant={[Function]}
            onResponderMove={[Function]}
            onResponderRelease={[Function]}
            onResponderTerminate={[Function]}
            onResponderTerminationRequest={[Function]}
            onStartShouldSetResponder={[Function]}
            style={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#b4b4b528",
                  "borderColor": "transparent",
                  "borderRadius": 9999,
                  "borderWidth": 1,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 1,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
                {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              ]
            }
            testID="vba-source-currency-pix-button"
          >
            <View
              style={
                [
                  {
                    "alignItems": "center",
                    "display": "flex",
                    "flexDirection": "row",
                    "gap": 0,
                  },
                  undefined,
                ]
              }
            >
              <Text
                accessibilityRole="text"
                ellipsizeMode="clip"
                numberOfLines={1}
                style={
                  [
                    {
                      "color": "#131416",
                      "flexGrow": 0,
                      "flexShrink": 1,
                      "flexWrap": "wrap",
                      "fontFamily": "Inter-Medium",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                      "textAlign": "center",
                    },
                    undefined,
                  ]
                }
              >
                View PIX instructions
              </Text>
            </View>
          </View>
          <View
            accessibilityLabel="Done"
            accessibilityRole="button"
            accessibilityState={
              {
                "busy": undefined,
                "checked": undefined,
                "disabled": false,
                "expanded": undefined,
                "selected": undefined,
              }
            }
            accessibilityValue={
              {
                "max": undefined,
                "min": undefined,
                "now": undefined,
                "text": undefined,
              }
            }
            accessible={true}
            collapsable={false}
            focusable={true}
            jestAnimatedProps={
              {
                "value": {},
              }
            }
            jestAnimatedStyle={
              {
                "value": {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              }
            }
            jestInlineStyle={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#131416",
                  "borderRadius": 9999,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 1,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
              ]
            }
            onBlur={[Function]}
            onClick={[Function]}
            onFocus={[Function]}
            onResponderGrant={[Function]}
            onResponderMove={[Function]}
            onResponderRelease={[Function]}
            onResponderTerminate={[Function]}
            onResponderTerminationRequest={[Function]}
            onStartShouldSetResponder={[Function]}
            style={
              [
                {
                  "alignItems": "center",
                  "backgroundColor": "#131416",
                  "borderRadius": 9999,
                  "flexDirection": "row",
                  "height": 48,
                  "justifyContent": "center",
                  "opacity": 1,
                  "overflow": "hidden",
                  "paddingLeft": 16,
                  "paddingRight": 16,
                  "width": "100%",
                },
                {
                  "transform": [
                    {
                      "scale": 1,
                    },
                  ],
                },
              ]
            }
            testID="vba-source-currency-done-button"
          >
            <View
              style={
                [
                  {
                    "alignItems": "center",
                    "display": "flex",
                    "flexDirection": "row",
                    "gap": 0,
                  },
                  undefined,
                ]
              }
            >
              <Text
                accessibilityRole="text"
                ellipsizeMode="clip"
                numberOfLines={1}
                style={
                  [
                    {
                      "color": "#ffffff",
                      "flexGrow": 0,
                      "flexShrink": 1,
                      "flexWrap": "wrap",
                      "fontFamily": "Inter-Medium",
                      "fontSize": 16,
                      "letterSpacing": 0,
                      "lineHeight": 24,
                      "textAlign": "center",
                    },
                    undefined,
                  ]
                }
              >
                Done
              </Text>
            </View>
          </View>
        </View>
      </View>
    `);
  });
});
