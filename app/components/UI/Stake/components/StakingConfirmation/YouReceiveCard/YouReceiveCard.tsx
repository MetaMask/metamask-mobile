import React from 'react';
import { View } from 'react-native';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../../component-library/base-components/TagBase';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Card from '../../../../../../component-library/components/Cards/Card';
import { renderFromWei } from '../../../../../../util/number/legacy';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './YouReceiveCard.styles';
import ethLogo from '../../../../../../images/ethereum.png';
import { YouReceiveCardProps } from './YouReceiveCard.types';
import { strings } from '../../../../../../../locales/i18n';

const YouReceiveCard = ({ amountWei, amountFiat }: YouReceiveCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Card style={styles.changesCard} disabled>
      <View style={styles.estimatedChangesWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('stake.estimated_changes')}
        </Text>
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
                {`+ ${renderFromWei(amountWei)}`}
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
            ${amountFiat}
          </Text>
        </View>
      </View>
    </Card>
  );
};

export default YouReceiveCard;
