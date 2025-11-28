import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
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
import { PredictClaimConfirmationSelectorsIDs } from '../../../../../../../e2e/selectors/Predict/Predict.selectors';
import styleSheet from './predict-claim-footer.styles';
import { selectPredictWonPositions } from '../../../../../UI/Predict/selectors/predictController';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { PredictPosition } from '../../../../../UI/Predict';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { BigNumber } from 'bignumber.js';
import ButtonHero from '../../../../../../component-library/components-temp/Buttons/ButtonHero';
import { ButtonBaseSize } from '@metamask/design-system-react-native';

export interface PredictClaimFooterProps {
  onPress: () => void;
}

export function PredictClaimFooter({ onPress }: PredictClaimFooterProps) {
  const { styles } = useStyles(styleSheet, {});

  const selectedAddress =
    useSelector(selectSelectedInternalAccountAddress) ?? '0x0';

  const wonPositions = useSelector(
    selectPredictWonPositions({
      address: selectedAddress,
    }),
  );

  if (!wonPositions?.length) {
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
        onPress={onPress}
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
      <Box flexDirection={FlexDirection.Column}>
        <Text variant={TextVariant.BodyMDMedium}>{position.title}</Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
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
