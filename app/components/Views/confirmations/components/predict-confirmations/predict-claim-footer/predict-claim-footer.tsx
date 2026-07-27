import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarGroup from '../../../../../../component-library/components/Avatars/AvatarGroup';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { Box } from '../../../../../UI/Box/Box';
import { PredictClaimConfirmationSelectorsIDs } from '../../../../../UI/Predict/Predict.testIds';
import styleSheet from './predict-claim-footer.styles';
import { selectPredictWonPositions } from '../../../../../UI/Predict/selectors/predictController';
import { PredictPosition } from '../../../../../UI/Predict';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import ButtonHero from '../../../../../../component-library/components-temp/Buttons/ButtonHero';
import { ButtonBaseSize } from '@metamask/design-system-react-native';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { RootState } from '../../../../../../reducers';

export interface PredictClaimFooterProps {
  onPress: () => void | Promise<void>;
  onError: (error?: Error) => void;
}

export function PredictClaimFooter({
  onPress,
  onError,
}: PredictClaimFooterProps) {
  const transactionMetadata = useTransactionMetadataRequest();
  const { styles } = useStyles(styleSheet, {});
  const { setIsConfirmationSubmitting } = useConfirmationContext();

  const address = transactionMetadata?.txParams.from;
  const transactionId = transactionMetadata?.id;

  const wonPositions = useSelector((state: RootState) =>
    selectPredictWonPositions(state, address ?? '0x'),
  );

  const hasNoPositions = !address || !wonPositions?.length;

  const hasTrackedNoPositions = useRef(false);

  useEffect(() => {
    if (hasNoPositions) {
      // Resolution-lag is the dominant claim failure mode (PRED-963). Route the
      // failure through the controller so it shares the per-attempt idempotency
      // guard with the transaction-status terminal event (preventing a
      // duplicate/contradictory `user_rejected` or `succeeded` for the same
      // claim). Render-level ref avoids re-firing on re-renders.
      if (!hasTrackedNoPositions.current) {
        hasTrackedNoPositions.current = true;
        Engine.context.PredictController?.trackClaimResolutionLagFailure?.({
          transactionId,
          address,
        });
      }

      onError(new Error('Tried to claim but no positions were won'));
    }
  }, [hasNoPositions, onError, address, transactionId]);

  const handlePress = useCallback(async () => {
    setIsConfirmationSubmitting(true);

    try {
      await onPress();
    } catch (error) {
      setIsConfirmationSubmitting(false);
      throw error;
    }
  }, [onPress, setIsConfirmationSubmitting]);

  if (hasNoPositions) {
    return null;
  }

  return (
    <Box style={styles.container} testID="predict-claim-footer">
      {wonPositions.length > 1 ? (
        <MultipleWinnings wonPositions={wonPositions} />
      ) : (
        <SingleWin wonPositions={wonPositions} />
      )}
      <ButtonHero
        testID={PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON}
        onPress={handlePress}
        size={ButtonBaseSize.Lg}
        isFullWidth
      >
        {strings('confirm.predict_claim.button_label')}
      </ButtonHero>
      <Text
        variant={TextVariant.BodyXS}
        color={TextColor.Alternative}
        style={styles.bottom}
      >
        {strings('confirm.predict_claim.footer_bottom')}
      </Text>
    </Box>
  );
}

function SingleWin({ wonPositions }: { wonPositions: PredictPosition[] }) {
  const { styles } = useStyles(styleSheet, {});
  const formatFiat = useFiatFormatter({ currency: 'usd' });

  const position = wonPositions[0];
  const { amount } = position;

  const amountFormatted = useMemo(
    () => formatFiat(new BigNumber(amount)),
    [amount, formatFiat],
  );

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={12}
    >
      <Avatar
        variant={AvatarVariant.Token}
        imageSource={{ uri: position.icon }}
        size={AvatarSize.Lg}
      />
      <Box flexDirection={FlexDirection.Column} style={styles.textContainer}>
        <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
          {position.title}
        </Text>
        <Text
          variant={TextVariant.BodySMMedium}
          color={TextColor.Alternative}
          numberOfLines={1}
        >
          {amountFormatted} on {position.outcome}
        </Text>
      </Box>
    </Box>
  );
}

function MultipleWinnings({
  wonPositions,
}: {
  wonPositions: PredictPosition[];
}) {
  const { styles } = useStyles(styleSheet, {});

  const positionIcons = wonPositions.map((position) => ({
    imageSource: { uri: position.icon },
    variant: AvatarVariant.Token as const,
  }));

  return (
    <Box style={styles.top}>
      <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
        {strings('confirm.predict_claim.footer_top', {
          count: wonPositions.length,
        })}
      </Text>
      <AvatarGroup
        avatarPropsList={positionIcons}
        size={AvatarSize.Sm}
        maxStackedAvatars={3}
      />
    </Box>
  );
}
