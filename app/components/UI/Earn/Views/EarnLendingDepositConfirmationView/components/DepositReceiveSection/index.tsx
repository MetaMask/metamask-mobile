import React from 'react';
import styleSheet from './DepositReceiveSection.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import ButtonIcon from '../../../../../../../component-library/components/Buttons/ButtonIcon';
import { TooltipSizes } from '../../../../../../../component-library/components-temp/KeyValueRow';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../../../hooks/useTooltipModal';
import AvatarToken from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import { TokenI } from '../../../../../Tokens/types';
import { strings } from '../../../../../../../../locales/i18n';

export const DEPOSIT_RECEIVE_SECTION_TEST_ID = 'depositReceiveSection';

export interface DepositReceiveSectionProps {
  token: TokenI;
  receiptTokenName: string;
  receiptTokenAmount: string;
  receiptTokenAmountFiat: string;
}

const DepositReceiveSection = ({
  token,
  receiptTokenName,
  receiptTokenAmount,
  receiptTokenAmountFiat,
}: DepositReceiveSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  return (
    <InfoSection testID={DEPOSIT_RECEIVE_SECTION_TEST_ID}>
      <View style={styles.infoSectionContent}>
        <View style={styles.receiveRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('earn.receive')}
          </Text>
          <ButtonIcon
            size={TooltipSizes.Sm}
            iconColor={IconColor.Alternative}
            iconName={IconName.Info}
            accessibilityRole={strings('earn.button')}
            accessibilityLabel={strings('earn.receive_tooltip')}
            onPress={() =>
              openTooltipModal(
                strings('earn.receive'),
                strings('earn.tooltip_content.receive'),
              )
            }
          />
        </View>
        <View style={styles.receiptTokenRow}>
          <View style={styles.receiptTokenRowLeft}>
            <AvatarToken
              name={token.symbol}
              imageSource={{ uri: token.image }}
              size={AvatarSize.Xs}
              style={styles.receiveTokenIcon}
            />
            <Text variant={TextVariant.BodyMD}>{receiptTokenName}</Text>
          </View>
          <View style={styles.receiptTokenRowRight}>
            <Text>{receiptTokenAmount}</Text>
            <Text color={TextColor.Alternative}>{receiptTokenAmountFiat}</Text>
          </View>
        </View>
      </View>
    </InfoSection>
  );
};

export default DepositReceiveSection;
