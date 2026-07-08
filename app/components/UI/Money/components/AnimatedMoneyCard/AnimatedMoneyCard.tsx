import React, { useCallback, useRef, useState } from 'react';
import { Image, StyleProp, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import Rive, { Fit, RiveRef, RNRiveError } from 'rive-react-native';
import { createProjectLogger } from '@metamask/utils';
import { selectMoneyCardTiltAnimationEnabledFlag } from '../../selectors/featureFlags';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useDeviceTilt } from '../../hooks/useDeviceTilt';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';
import CardTiltAnimation from '../../../../../animations/card_tilt_v1.2.riv';
import styles from './AnimatedMoneyCard.styles';
import { AnimatedMoneyCardTestIds } from './AnimatedMoneyCard.testIds';

const log = createProjectLogger('money-card-tilt');

const RIVE_ARTBOARD_NAME = 'DigitalCard';
const RIVE_STATE_MACHINE_NAME = 'MainTilt';

const RIVE_INPUTS = {
  virtual: { tiltX: 'digitalTiltX', tiltY: 'digitalTiltY' },
  metal: { tiltX: 'metalTiltX', tiltY: 'metalTiltY' },
} as const;

const RIVE_CARD_TYPE_INPUT = 'cardType';
const RIVE_CARD_TYPE_VALUE = { virtual: 0, metal: 1 } as const;

interface AnimatedMoneyCardProps {
  cardType: 'virtual' | 'metal';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedMoneyCard = ({
  cardType,
  style,
  testID,
}: AnimatedMoneyCardProps) => {
  const flagEnabled = useSelector(selectMoneyCardTiltAnimationEnabledFlag);
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const riveRef = useRef<RiveRef>(null);

  const animate = flagEnabled && !reduceMotion && !hasRiveError;

  const applyTilt = useCallback(
    (x: number, y: number) => {
      const rive = riveRef.current;
      if (!rive) return;

      const inputs = RIVE_INPUTS[cardType];
      try {
        rive.setInputState(RIVE_STATE_MACHINE_NAME, inputs.tiltX, x);
        rive.setInputState(RIVE_STATE_MACHINE_NAME, inputs.tiltY, y);
        rive.setInputState(
          RIVE_STATE_MACHINE_NAME,
          RIVE_CARD_TYPE_INPUT,
          RIVE_CARD_TYPE_VALUE[cardType],
        );
      } catch (error) {
        log(`Rive input error: ${String(error)}`);
      }
    },
    [cardType],
  );

  useDeviceTilt(applyTilt, { enabled: animate });

  const handleError = useCallback((riveError: RNRiveError) => {
    log(`Rive error: ${riveError.message}`);
    setHasRiveError(true);
  }, []);

  if (!animate) {
    return (
      <Box style={style} testID={testID ?? AnimatedMoneyCardTestIds.CONTAINER}>
        <Image
          source={cardType === 'metal' ? mmCardMetal : mmCardRegular}
          style={styles.rive}
          resizeMode="contain"
          testID={AnimatedMoneyCardTestIds.STATIC_IMAGE}
        />
      </Box>
    );
  }

  return (
    <Box style={style} testID={testID ?? AnimatedMoneyCardTestIds.CONTAINER}>
      <Rive
        ref={riveRef}
        source={CardTiltAnimation}
        artboardName={RIVE_ARTBOARD_NAME}
        stateMachineName={RIVE_STATE_MACHINE_NAME}
        fit={Fit.Contain}
        style={styles.rive}
        onError={handleError}
        testID={AnimatedMoneyCardTestIds.RIVE}
      />
    </Box>
  );
};

export default AnimatedMoneyCard;
