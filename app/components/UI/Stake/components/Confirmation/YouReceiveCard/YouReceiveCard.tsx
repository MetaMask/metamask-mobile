import React from 'react';
import { View } from 'react-native';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import { TooltipSizes } from '../../../../../../component-library/components-temp/KeyValueRow';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../../component-library/components/Avatars/Avatar';
import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Card from '../../../../../../component-library/components/Cards/Card';
import { renderFromWei } from '../../../../../../util/number';
import { useStyles } from '../../../../../hooks/useStyles';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import styleSheet from './YouReceiveCard.styles';
import ethLogo from '../../../../../../images/ethereum.png';
import { YouReceiveCardProps } from './YouReceiveCard.types';
import { strings } from '../../../../../../../locales/i18n';

const YouReceiveCard = ({ wei, fiat }: YouReceiveCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const handleDisplayEstimatedChangesTooltip = () =>
    openTooltipModal(
      'TODO',
      'Aute commodo incididunt culpa aliquip adipisicing cupidatat veniam culpa veniam officia dolor. Consectetur elit ut adipisicing esse nisi duis dolor.',
    );

  return (
    <Card style={styles.changesCard} disabled>
      <View style={styles.estimatedChangesWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('stake.estimated_changes')}
        </Text>
        <ButtonIcon
          size={TooltipSizes.Sm}
          iconColor={IconColor.Muted}
          iconName={IconName.Question}
          accessibilityRole="button"
          accessibilityLabel={strings(
            'stake.accessibility_labels.unstake_estimated_changes',
          )}
          onPress={handleDisplayEstimatedChangesTooltip}
        />
      </View>
      <View style={styles.youReceiveWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('stake.you_receive')}
        </Text>
        <View style={styles.youReceiveRightSide}>
          <View style={styles.flexRow}>
            <TagBase severity={TagSeverity.Success} shape={TagShape.Pill}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Success}
              >
                {`+ ${renderFromWei(wei)}`}
              </Text>
            </TagBase>
            <TagBase
              severity={TagSeverity.Neutral}
              shape={TagShape.Pill}
              startAccessory={
                <Avatar
                  variant={AvatarVariant.Network}
                  imageSource={ethLogo}
                  size={AvatarSize.Xs}
                />
              }
            >
              <Text>ETH</Text>
            </TagBase>
          </View>
          <Text style={styles.youReceiveFiat} variant={TextVariant.BodySM}>
            ${fiat}
          </Text>
        </View>
      </View>
    </Card>
  );
};

export default YouReceiveCard;
