import React from 'react';
import styleSheet from './DepositReceiveSection.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import InfoSection from '../../../../../../Views/confirmations/components/UI/info-row/info-section';
import { View } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import useTooltipModal from '../../../../../../hooks/useTooltipModal';
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
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('earn.receive')}
          </Text>
          <ButtonIcon
            style={styles.infoIcon}
            size={ButtonIconSize.Xs}
            iconProps={{ color: IconColor.IconAlternative }}
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
              src={{
                uri: token.image,
              }}
              size={AvatarTokenSize.Xs}
              twClassName="bg-default"
              style={styles.receiveTokenIcon}
            />
            <Text variant={TextVariant.BodyMd}>{receiptTokenName}</Text>
          </View>
          <View style={styles.receiptTokenRowRight}>
            <Text>{receiptTokenAmount}</Text>
            <Text color={TextColor.TextAlternative}>
              {receiptTokenAmountFiat}
            </Text>
          </View>
        </View>
      </View>
    </InfoSection>
  );
};

export default DepositReceiveSection;
