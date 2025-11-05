import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarGroup from '../../../../../../component-library/components/Avatars/AvatarGroup';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
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

  const positionIcons = wonPositions.map((position) => ({
    imageSource: { uri: position.icon },
    variant: AvatarVariant.Token as const,
  }));

  return (
    <Box style={styles.container} testID="predict-claim-footer">
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
      <Button
        variant={ButtonVariants.Primary}
        labelTextVariant={TextVariant.BodyLGMedium}
        style={styles.button}
        label={strings('confirm.predict_claim.button_label')}
        onPress={onPress}
        isInverse
        testID={PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON}
      />
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
