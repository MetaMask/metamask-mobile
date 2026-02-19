import React, { useCallback } from 'react';
import { View } from 'react-native';
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
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { strings } from '../../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { useNetworkName } from '../../../../../Views/confirmations/hooks/useNetworkName';
import { Hex } from '@metamask/utils';
import { useStyles } from '../../../../../hooks/useStyles';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { EarnNetworkAvatar } from '../../EarnNetworkAvatar';
import styleSheet from './ConvertTokenRow.styles';
import { ConvertTokenRowProps } from './ConvertTokenRow.types';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import BigNumber from 'bignumber.js';

/**
 * Test IDs for the ConvertTokenRow component.
 */
export const ConvertTokenRowTestIds = {
  CONTAINER: 'convert-token-row-container',
  TOKEN_ICON: 'convert-token-row-token-icon',
  TOKEN_NAME: 'convert-token-row-token-name',
  TOKEN_BALANCE: 'convert-token-row-token-balance',
  MAX_BUTTON: 'convert-token-row-max-button',
  EDIT_BUTTON: 'convert-token-row-edit-button',
} as const;

/**
 * A row component for displaying a token in the Quick Convert list.
 *
 * Displays:
 * - Token icon with network badge
 * - Token name and balance
 * - Max and Edit buttons
 */
const ConvertTokenRow: React.FC<ConvertTokenRowProps> = ({
  token,
  onMaxPress,
  onEditPress,
  isActionsDisabled = false,
  isConversionPending = false,
  errorMessage,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const networkName = useNetworkName(token.chainId as Hex | undefined);

  const formatFiat = useFiatFormatter();

  const handleMaxPress = useCallback(() => {
    if (isActionsDisabled || isConversionPending) {
      return;
    }
    onMaxPress(token);
  }, [isActionsDisabled, isConversionPending, onMaxPress, token]);

  const handleEditPress = useCallback(() => {
    if (isActionsDisabled || isConversionPending) {
      return;
    }
    onEditPress(token);
  }, [isActionsDisabled, isConversionPending, onEditPress, token]);

  return (
    <View style={styles.container} testID={ConvertTokenRowTestIds.CONTAINER}>
      <View style={styles.row}>
        {/* Left side: Token icon and info */}
        <View style={styles.left}>
          <View testID={ConvertTokenRowTestIds.TOKEN_ICON}>
            <View style={styles.tokenIconContainer}>
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
            </View>
          </View>
          <View style={styles.tokenInfo}>
            <Text
              variant={TextVariant.BodyMDMedium}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID={ConvertTokenRowTestIds.TOKEN_BALANCE}
            >
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
        <View style={styles.right}>
          {isConversionPending ? (
            <Spinner />
          ) : (
            <>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={handleMaxPress}
                isDisabled={isActionsDisabled}
                testID={ConvertTokenRowTestIds.MAX_BUTTON}
              >
                <Text variant={TextVariant.BodyMDMedium}>
                  {strings('earn.musd_conversion.max')}
                </Text>
              </Button>
              <ButtonIcon
                style={styles.editButton}
                iconName={IconName.Edit}
                size={ButtonIconSize.Lg}
                iconProps={{ size: IconSize.Sm }}
                onPress={handleEditPress}
                isDisabled={isActionsDisabled}
                testID={ConvertTokenRowTestIds.EDIT_BUTTON}
              />
            </>
          )}
        </View>
      </View>
      {errorMessage ? (
        <Text variant={TextVariant.BodySM} style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
};

export default ConvertTokenRow;
