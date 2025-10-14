import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-footer.styles';
import AvatarGroup from '../../../../../../component-library/components/Avatars/AvatarGroup';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../../locales/i18n';
import {
  getPredictMarketImage,
  selectPredictClaimDataByTransactionId,
} from '../predict-temp';
import { RootState } from '../../../../../../reducers';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useSelector } from 'react-redux';

export interface PredictClaimFooterProps {
  onPress: () => void;
}

export function PredictClaimFooter({ onPress }: PredictClaimFooterProps) {
  const { styles } = useStyles(styleSheet, {});
  const { id: transactionId } = useTransactionMetadataRequest() ?? {};

  const { marketIds } =
    useSelector((state: RootState) =>
      selectPredictClaimDataByTransactionId(state, transactionId ?? ''),
    ) ?? {};

  if (!marketIds) return null;

  const networkAvatars = marketIds.map((marketId) => ({
    imageSource: getPredictMarketImage(marketId),
    variant: AvatarVariant.Token as const,
  }));

  return (
    <Box style={styles.container} testID="predict-claim-footer">
      <Box style={styles.top}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('confirm.predict_claim.footer_top', {
            count: marketIds.length,
          })}
        </Text>
        <AvatarGroup
          avatarPropsList={networkAvatars}
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
