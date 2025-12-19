import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  IconSize,
} from '@metamask/design-system-react-native';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { useStyles } from '../../../../../hooks/useStyles';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { EarnNetworkAvatar } from '../../EarnNetworkAvatar';
import { TokenIconWithSpinner } from '../../TokenIconWithSpinner';
import { useMusdQuickConvertPercentage } from '../../../hooks/useMusdQuickConvertPercentage';
import styleSheet from './ConvertTokenRow.styles';
import {
  ConvertTokenRowProps,
  ConvertTokenRowTestIds,
} from './ConvertTokenRow.types';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import BigNumber from 'bignumber.js';

/**
 * A row component for displaying a token in the Quick Convert list.
 *
 * Displays:
 * TODO: Circle back on the loading/pending states.
 * - Token icon with network badge (or spinner if pending)
 * - Token name and balance
 * - Max and Edit buttons (or spinner if conversion is pending)
 */
const ConvertTokenRow: React.FC<ConvertTokenRowProps> = ({
  token,
  onMaxPress,
  onEditPress,
  status,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const networkName = useSelector(selectNetworkName);
  const { buttonLabel } = useMusdQuickConvertPercentage();

  const isPending = status === 'pending';

  const formatFiat = useFiatFormatter();

  const handleMaxPress = useCallback(() => {
    onMaxPress(token);
  }, [onMaxPress, token]);

  const handleEditPress = useCallback(() => {
    onEditPress(token);
  }, [onEditPress, token]);

  // Render token icon - show spinner if pending
  const renderTokenIcon = () => {
    if (isPending) {
      return (
        <View
          style={styles.spinnerContainer}
          testID={ConvertTokenRowTestIds.SPINNER}
        >
          <TokenIconWithSpinner
            tokenSymbol={token.symbol}
            tokenIcon={token.image}
          />
        </View>
      );
    }

    return (
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            name={networkName}
            imageSource={getNetworkImageSource({
              chainId: token.chainId ?? '',
            })}
            isScaled={false}
            size={AvatarSize.Xs}
          />
        }
      >
        <EarnNetworkAvatar token={token} />
      </BadgeWrapper>
    );
  };

  // TODO: Breakout into component for better debugging
  // Render action buttons - hide if pending
  const renderActions = () => {
    if (isPending) {
      // When pending, we show the spinner on the token icon, no buttons needed
      return null;
    }

    return (
      <>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleMaxPress}
          testID={ConvertTokenRowTestIds.MAX_BUTTON}
        >
          <Text variant={TextVariant.BodyMDMedium}>{buttonLabel}</Text>
        </Button>
        <ButtonIcon
          style={styles.editButton}
          iconName={IconName.Edit}
          size={ButtonIconSize.Lg}
          iconProps={{ size: IconSize.Sm }}
          onPress={handleEditPress}
          testID={ConvertTokenRowTestIds.EDIT_BUTTON}
        />
      </>
    );
  };

  return (
    <View style={styles.container} testID={ConvertTokenRowTestIds.CONTAINER}>
      {/* Left side: Token icon and info */}
      <View style={styles.left}>
        <View testID={ConvertTokenRowTestIds.TOKEN_ICON}>
          {renderTokenIcon()}
        </View>
        <View style={styles.tokenInfo}>
          <Text
            variant={TextVariant.BodyMDMedium}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID={ConvertTokenRowTestIds.TOKEN_BALANCE}
          >
            {/* TODO: Determine if we want to fallback to the token balance if fiat isn't available. This may not be desired. */}
            {formatFiat(new BigNumber(token?.fiat?.balance ?? '0')) ??
              `${token.balance} ${token.symbol}`}
          </Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
            numberOfLines={1}
            testID={ConvertTokenRowTestIds.TOKEN_NAME}
          >
            {token.symbol}
          </Text>
        </View>
      </View>

      {/* Right side: Action buttons or status */}
      <View style={styles.right}>{renderActions()}</View>
    </View>
  );
};

export default ConvertTokenRow;
