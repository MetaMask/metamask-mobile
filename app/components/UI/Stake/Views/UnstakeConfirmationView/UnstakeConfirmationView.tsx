import { StyleSheet, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './UnstakeConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { getStakeConfirmationNavbar } from '../../../Navbar';
import AmountHeader from '../../components/StakingConfirmation/AmountHeader/AmountHeader';
import Card from '../../../../../component-library/components/Cards/Card';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../component-library/components-temp/KeyValueRow';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { renderFromWei } from '../../../../../util/number';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import ethLogo from '../../../../../images/ethereum.png';
import AccountHeaderCard from '../../components/StakingConfirmation/AccountHeaderCard/AccountHeaderCard';
import { strings } from '../../../../../../locales/i18n';
import EstimatedGasCard from '../../components/StakingConfirmation/EstimatedGasCard/EstimatedGasCard';
import ConfirmationFooter from '../../components/StakingConfirmation/ConfirmationFooter/ConfirmationFooter';

const MOCK_UNSTAKE_DATA = {
  wei: '4999820000000000000',
  fiat: '12,881.64',
};

const MOCK_STAKING_CONTRACT_NAME = 'MM Pooled Staking';

const MOCK_GAS_COST = {
  gasCostEth: '0.0884',
  gasCostFiat: '43.56',
};

const youReceiveStyles = () =>
  StyleSheet.create({
    changesCard: {
      borderWidth: 0,
      borderRadius: 8,
      gap: 16,
    },
    estimatedChangesWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    youReceiveWrapper: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    youReceiveRightSide: {
      alignItems: 'flex-end',
      gap: 2,
    },
    flexRow: {
      flexDirection: 'row',
      gap: 4,
    },
    youReceiveFiat: {
      paddingRight: 8,
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
    },
  });

const YouReceiveCard = () => {
  const { styles } = useStyles(youReceiveStyles, {});

  const { openTooltipModal } = useTooltipModal();

  const handleDisplayEstimatedChangesTooltip = () =>
    openTooltipModal(
      'TODO',
      'Aute commodo incididunt culpa aliquip adipisicing cupidatat veniam culpa veniam officia dolor. Consectetur elit ut adipisicing esse nisi duis dolor.',
    );

  return (
    <Card style={styles.changesCard} disabled>
      <View style={styles.estimatedChangesWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>Estimated changes</Text>
        <ButtonIcon
          size={TooltipSizes.Md}
          iconColor={IconColor.Muted}
          iconName={IconName.Question}
          accessibilityRole="button"
          accessibilityLabel="unstake estimated changes tooltip"
          onPress={handleDisplayEstimatedChangesTooltip}
        />
      </View>
      <View style={styles.youReceiveWrapper}>
        <Text variant={TextVariant.BodyMDMedium}>You receive</Text>
        <View style={styles.youReceiveRightSide}>
          <View style={styles.flexRow}>
            {/* Gain Tag */}
            <TagBase severity={TagSeverity.Success} shape={TagShape.Pill}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Success}
              >
                {`+ ${renderFromWei(MOCK_UNSTAKE_DATA.wei)}`}
              </Text>
            </TagBase>
            {/* ETH Tag */}
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
            ${MOCK_UNSTAKE_DATA.fiat}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const unstakingTimeCardStyles = () =>
  StyleSheet.create({
    card: {
      borderWidth: 0,
      borderRadius: 8,
      gap: 16,
    },
  });

const UnstakingTimeCard = () => {
  const { styles } = useStyles(unstakingTimeCardStyles, {});

  return (
    <Card style={styles.card} disabled>
      <KeyValueRow
        field={{
          label: { text: 'Unstaking time' },
          tooltip: {
            title: 'Unstaking time',
            text: 'On average, it takes less than 3 days for the unstaked ETH to be claimable, but can take up to 11 days',
          },
        }}
        value={{
          label: { text: 'Up to 11 days', variant: TextVariant.BodyMD },
        }}
      />
    </Card>
  );
};

// TODO: Clean up styles.
// TODO: Breakout new components.
// TODO: Replace hardcoded strings with translations variables.
const UnstakeConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions(
      getStakeConfirmationNavbar(navigation, theme.colors, 'Unstake'),
    );
  }, [navigation, theme.colors]);

  return (
    <View style={styles.mainContainer}>
      <View>
        <AmountHeader
          wei={MOCK_UNSTAKE_DATA.wei}
          fiat={`$${MOCK_UNSTAKE_DATA.fiat}`}
          tokenSymbol="ETH"
        />
        <View style={styles.cardsContainer}>
          <YouReceiveCard />
          <AccountHeaderCard
            contractName={MOCK_STAKING_CONTRACT_NAME}
            primaryLabel="Unstaking to"
            secondaryLabel={strings('stake.interacting_with')}
          />
          <EstimatedGasCard
            gasCostEth={`${MOCK_GAS_COST.gasCostEth} ETH`}
            gasCostFiat={`$${MOCK_GAS_COST.gasCostFiat}`}
          />
          <UnstakingTimeCard />
        </View>
      </View>
      <ConfirmationFooter />
    </View>
  );
};

export default UnstakeConfirmationView;
