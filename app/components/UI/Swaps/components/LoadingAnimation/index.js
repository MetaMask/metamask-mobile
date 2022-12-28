import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, View, StyleSheet, Image } from 'react-native';
import PropTypes from 'prop-types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import Device from '../../../../../util/device';
import { strings } from '../../../../../../locales/i18n';

import Text from '../../../../Base/Text';
import Title from '../../../../Base/Title';
import Fox from '../../../Fox';
import backgroundShapes from './backgroundShapes';
import { useTheme } from '../../../../../util/theme';

const ANIM_MULTIPLIER = 0.67;
const INITIAL_DELAY = 1000 * ANIM_MULTIPLIER;
const DELAY = 1000 * ANIM_MULTIPLIER;
const PAN_DURATION = 500 * ANIM_MULTIPLIER;
const FINISH_DURATION = 750 * ANIM_MULTIPLIER;

const IS_NARROW = Device.getDeviceWidth() <= 320;
const STAGE_SIZE = IS_NARROW ? 240 : 260;
const AGG_RADIO = STAGE_SIZE * (IS_NARROW ? 0.2 : 0.25);
const PAN_RADIO = STAGE_SIZE * 0.6;

// Percentage of the progress bar after iterating through
// all aggregators, this is the starting point of
// "finalizing" animationg
const FINALIZING_PERCENTAGE = 80;

const createStyles = (colors, shadows) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginVertical: 15,
    },
    progressWrapper: {
      backgroundColor: colors.primary.muted,
      height: 3,
      borderRadius: 3,
      marginVertical: 15,
    },
    progressBar: {
      backgroundColor: colors.primary.default,
      height: 3,
      width: 3,
      borderRadius: 3,
      flex: 1,
    },
    aggContainer: {
      position: 'absolute',
      backgroundColor: colors.background.default,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      opacity: 0,
      top: '50%',
      left: '50%',
      ...shadows.size.sm,
      elevation: 15,
    },
    aggImage: {
      width: 75,
      height: 30,
    },
    foxContainer: {
      width: STAGE_SIZE,
      height: STAGE_SIZE,
    },
    text: {
      color: colors.text.default,
    },
  });

const customStyle = (colors) => `
  body {
    background-color: ${colors.background.default};
  }
  #head {
    height: 35%;
    top: 50%;
    transform: translateY(-50%);
  }
  #bgShapes {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 70%;
    height: 70%;
    transform: translateX(-50%) translateY(-50%) rotate(0deg);
    animation: rotate 50s linear infinite;
  }

  @keyframes rotate {
    to {
      transform: translateX(-50%) translateY(-50%) rotate(360deg);
    }
  }
`;

function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function LoadingAnimation({
  finish,
  onAnimationEnd,
  aggregatorMetadata,
  headPan = true,
}) {
  const [metadata, setMetadata] = useState([]);
  const [shouldStart, setShouldStart] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [hasStartedFinishing, setHasStartedFinishing] = useState(false);
  const [renderLogos, setRenderLogos] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  /* References */
  const foxRef = useRef();
  const foxHeadPan = useRef(new Animated.ValueXY(0, 0)).current;
  const currentQuoteIndexValue = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const progressWidth = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const { colors, shadows } = useTheme();
  const styles = createStyles(colors, shadows);

  /* Animation constructions */

  /*
   * == Positions
   * This generates a random position for the aggregator in the stage
   * the values returned contain both the values for the head pan and
   * the logo positioning around it.
   */
  const positions = useMemo(
    () =>
      headPan
        ? metadata.reduce((acc, curr, index) => {
            // Vertical position is random and is in range [-0.6, 0.6]
            // making the head not look so steep up/down
            const y = Math.random() * 0.6 * (Math.random() < 0.5 ? -1 : 1);
            const isNegativeY = y < 0;

            // Horizontal position will be to the left or right depending 70% on the
            // index, this ensures the head moves from left to right in these cases
            // Otherwise is random.
            const isNegativeX =
              Math.random() < 0.7 ? index % 2 === 0 : Math.random() < 0.5;
            const x = isNegativeX ? -1 : 1;

            // Head pan values, horizontal pan value is randomly changed by [-0.4,0.4]
            // so the head rotates differently some times.
            const panRadioX = (x + (0.8 * Math.random() - 0.8)) * PAN_RADIO;
            const panRadioY = y * PAN_RADIO;

            // Icons positions are compensated by their size according to the position
            const radioY = AGG_RADIO * y - (isNegativeY ? 40 : 0);
            // Horizontal position depends on vertical position, making the logo sit
            // in a radius from origin and not always same horizontal distance
            const radioX =
              Math.sqrt(1 - Math.pow(y, 2)) * x * AGG_RADIO -
              (isNegativeX ? 95 : 0);

            return {
              ...acc,
              [curr.key]: [panRadioX, panRadioY, radioX, radioY],
            };
            // eslint-disable-next-line no-mixed-spaces-and-tabs
          }, {})
        : {},
    [metadata, headPan],
  );

  // The opacity for each of the icons
  const opacities = useMemo(
    () =>
      headPan
        ? metadata.reduce(
            (acc, curr) => ({
              ...acc,
              [curr.key]: new Animated.Value(0),
            }),
            {},
            // eslint-disable-next-line no-mixed-spaces-and-tabs
          )
        : {},
    [metadata, headPan],
  );

  // The sequence for each aggregator
  const animationSequence = useMemo(
    () =>
      headPan
        ? [
            // Animated.delay(INITIAL_DELAY),
            ...metadata.reduce(
              (acc, cur, index, array) => [
                ...acc,
                // Time to delay next iteration, this is the amount of time the head looks at the icon
                Animated.delay(index > 0 ? DELAY : 0),
                // Track the current index of the array
                Animated.timing(currentQuoteIndexValue, {
                  toValue: index,
                  duration: 0,
                  useNativeDriver: true,
                }),
                Animated.parallel([
                  // If is not the first aggregator, reduce previous aggregator opacity to 1
                  index > 0 &&
                    Animated.timing(opacities[array[index - 1].key], {
                      toValue: 0,
                      duration: PAN_DURATION,
                      useNativeDriver: true,
                    }),
                  // Set current aggregator opacity to 1
                  Animated.timing(opacities[cur.key], {
                    toValue: 1,
                    duration: PAN_DURATION,
                    useNativeDriver: true,
                  }),
                  // Update progress bar given the current index
                  Animated.timing(progressValue, {
                    toValue:
                      (FINALIZING_PERCENTAGE / array.length) * (index + 1),
                    duration: PAN_DURATION,
                    useNativeDriver: false,
                  }),
                  // Make the fox head pan to the aggregator position
                  !Device.isAndroid() &&
                    Animated.timing(foxHeadPan, {
                      toValue: {
                        x: positions[cur.key][0],
                        y: positions[cur.key][1],
                      },
                      duration: PAN_DURATION,
                      useNativeDriver: true,
                    }),
                ]),
              ],
              [],
            ),
            // Final animation of the sequence
            Animated.delay(DELAY),
            Animated.parallel([
              // Set last aggregator icon opacity to 0
              Animated.timing(opacities[[...metadata].pop()?.key], {
                toValue: 0,
                duration: PAN_DURATION,
                useNativeDriver: true,
              }),
              // Reset to fox head to origing
              !Device.isAndroid() &&
                Animated.timing(foxHeadPan, {
                  toValue: { x: 0, y: 0 },
                  duration: PAN_DURATION,
                  useNativeDriver: true,
                }),
            ]),
            // eslint-disable-next-line no-mixed-spaces-and-tabs
          ]
        : [],
    [
      currentQuoteIndexValue,
      foxHeadPan,
      headPan,
      metadata,
      opacities,
      positions,
      progressValue,
    ],
  );

  const startAnimation = useCallback(() => {
    setHasStarted(true);
    Animated.sequence(animationSequence).start(() => {
      setHasFinished(true);
    });
  }, [animationSequence]);

  const endAnimation = useCallback(() => {
    setHasStartedFinishing(true);
    Animated.timing(progressValue, {
      toValue: 100,
      duration: FINISH_DURATION,
      useNativeDriver: false,
    }).start(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    });
  }, [onAnimationEnd, progressValue]);

  /* Effects */

  /* Check and wait for metadata */
  useEffect(() => {
    (async () => {
      if (hasStarted) {
        return;
      }
      if (!aggregatorMetadata) {
        try {
          const { SwapsController } = Engine.context;
          await SwapsController.fetchAggregatorMetadataWithCache();
        } catch (error) {
          Logger.error(
            error,
            'Swaps: Error fetching agg metadata in animation',
          );
        }
      } else {
        const metadata = Object.entries(aggregatorMetadata).map(
          ([key, value]) => ({
            key,
            ...value,
          }),
        );
        setMetadata(metadata);
        setShouldStart(true);
      }
    })();
  }, [aggregatorMetadata, hasStarted]);

  /* Delay the logos rendering to avoid navigation transition lag */
  useEffect(() => {
    if (!renderLogos) {
      const timeout = setTimeout(() => {
        setRenderLogos(true);
      }, INITIAL_DELAY);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [renderLogos]);

  /* Effect to start animation. Useful in case we want to wait for metadata to update before start */
  useEffect(() => {
    if (!(shouldStart && renderLogos) || hasStarted) {
      return;
    }
    startAnimation();
  }, [hasStarted, renderLogos, shouldStart, startAnimation]);

  /* Effect to finish animation once sequence is completed */
  useEffect(() => {
    if (hasFinished && finish && !hasStartedFinishing) {
      endAnimation();
    }
  }, [endAnimation, finish, hasFinished, hasStartedFinishing]);

  /* Effect to track current aggregator index being animated */
  useEffect(() => {
    const listener = currentQuoteIndexValue.addListener(({ value }) => {
      setCurrentQuoteIndex(Math.ceil(value));
    });

    return () => {
      currentQuoteIndexValue.removeListener(listener);
    };
  });

  /* Fox Head Pan listener and web view reload effect */
  useEffect(() => {
    const listener = foxHeadPan.addListener(({ x, y }) => {
      requestAnimationFrame(() => {
        if (foxRef?.current?.injectJavaScript) {
          const JS = `window.dispatchEvent(new CustomEvent('nativedeviceorientation', {
                  detail: {
                    alpha: 0,
                    beta: ${round(-y, 4)},
                    gamma: ${round(-x, 4)}
                  }
                }));
                `;
          foxRef.current.injectJavaScript(JS);
        }
      });
    });

    if (foxRef?.current?.reload && Device.isAndroid()) {
      foxRef.current.reload();
    }

    return () => {
      foxHeadPan.removeListener(listener);
    };
  }, [foxHeadPan]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {headPan ? (
          <>
            <Text style={styles.text} small centered>
              {hasStarted ? (
                <>
                  {strings('swaps.quote')}{' '}
                  <Text reset bold>
                    {currentQuoteIndex + 1} {strings('swaps.of')}{' '}
                    {metadata?.length}
                  </Text>
                </>
              ) : (
                ''
              )}
            </Text>
            {!hasStarted && (
              <Title style={styles.text} centered>
                {strings('swaps.starting')}
              </Title>
            )}
            {hasStarted && !hasFinished && (
              <Title style={styles.text} centered>
                {strings('swaps.checking')} {metadata[currentQuoteIndex]?.title}
                ...
              </Title>
            )}
            {hasFinished && (
              <Title style={styles.text} centered>
                {strings('swaps.finalizing')}
              </Title>
            )}
          </>
        ) : (
          <>
            <Title style={styles.text} centered>
              {strings('swaps.fetching_quotes')}
            </Title>
          </>
        )}

        <View style={styles.progressWrapper}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth }]}
          />
        </View>
      </View>
      <View style={styles.foxContainer} pointerEvents="none">
        <Fox
          ref={foxRef}
          customContent={backgroundShapes}
          customStyle={customStyle(colors)}
          renderLoading={() => null}
        />
        {renderLogos &&
          headPan &&
          metadata &&
          metadata.map((agg) => (
            <Animated.View
              key={agg.key}
              style={[
                styles.aggContainer,
                {
                  backgroundColor: agg.color,
                  shadowColor: agg.color,
                  opacity: opacities[agg.key],
                  transform: [
                    { translateX: positions[agg.key][2] },
                    { translateY: positions[agg.key][3] },
                  ],
                },
              ]}
            >
              <Image
                style={styles.aggImage}
                resizeMode="contain"
                source={{ uri: agg.iconPng }}
              />
            </Animated.View>
          ))}
      </View>
    </View>
  );
}

LoadingAnimation.propTypes = {
  /**
   * Wether to execute the "Finalizing" animation after the main sequence
   */
  finish: PropTypes.bool,
  /**
   * Function callback executed once both the main sequence and the finalizing animation ends
   */
  onAnimationEnd: PropTypes.func,
  /**
   * Aggregator metada from Swaps controller API
   */
  aggregatorMetadata: PropTypes.object,
  /**
   * Wether to show head panning animation with aggregators logos
   */
  headPan: PropTypes.bool,
};

export default LoadingAnimation;
