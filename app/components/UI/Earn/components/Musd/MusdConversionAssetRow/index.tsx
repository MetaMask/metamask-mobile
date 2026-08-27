import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  ButtonIcon,
  ButtonIconSize,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { EarnNetworkAvatar } from '../../EarnNetworkAvatar';
import styleSheet from './MusdConversionAssetRow.styles';
import { MusdConversionAssetRowProps } from './MusdConversionAssetRow.types';
import useFiatFormatter from '../../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import BigNumber from 'bignumber.js';

/**
 * Test IDs for the MusdConversionAssetRow component.
 */
export const MusdConversionAssetRowTestIds = {
  CONTAINER: 'musd-conversion-asset-row-container',
  TOKEN_ICON: 'musd-conversion-asset-row-token-icon',
  TOKEN_NAME: 'musd-conversion-asset-row-token-name',
  TOKEN_BALANCE: 'musd-conversion-asset-row-token-balance',
  MAX_BUTTON: 'musd-conversion-asset-row-max-button',
  EDIT_BUTTON: 'musd-conversion-asset-row-edit-button',
} as const;

/**
 * A row component that exposes the Max and Edit conversion buttons for a token.
 *
 * Displays:
 * - Token icon with network badge
 * - Token name and balance
 * - Max and Edit buttons
 */
const MusdConversionAssetRow: React.FC<MusdConversionAssetRowProps> = ({
  token,
  onMaxPress,
  onEditPress,
  areActionsDisabled = false,
  isConversionPending = false,
  errorMessage,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const formatFiat = useFiatFormatter();
  const fiatBalance = token?.fiat?.balance;
  const hasDisplayableFiatBalance =
    typeof fiatBalance === 'number' && fiatBalance > 0;
  const formattedBalance = hasDisplayableFiatBalance
    ? formatFiat(new BigNumber(fiatBalance))
    : `${token.balance} ${token.symbol}`;

  const handleMaxPress = useCallback(() => {
    if (areActionsDisabled || isConversionPending) {
      return;
    }
    onMaxPress(token);
  }, [areActionsDisabled, isConversionPending, onMaxPress, token]);

  const handleEditPress = useCallback(() => {
    if (areActionsDisabled || isConversionPending) {
      return;
    }
    onEditPress(token);
  }, [areActionsDisabled, isConversionPending, onEditPress, token]);

  return (
    <View
      style={styles.container}
      testID={MusdConversionAssetRowTestIds.CONTAINER}
    >
      <View style={styles.row}>
        {/* Left side: Token icon and info */}
        <View style={styles.left}>
          <View testID={MusdConversionAssetRowTestIds.TOKEN_ICON}>
            <View style={styles.tokenIconContainer}>
              <BadgeWrapper
                position={BadgeWrapperPosition.BottomRight}
                badge={
                  <BadgeNetwork
                    twClassName="h-4 w-4 rounded bg-default"
                    src={
                      getNetworkImageSource({
                        chainId: token.chainId ?? '',
                      }) as React.ComponentProps<typeof BadgeNetwork>['src']
                    }
                  />
                }
              >
                <EarnNetworkAvatar token={token} />
              </BadgeWrapper>
            </View>
          </View>
          <View style={styles.tokenInfo}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID={MusdConversionAssetRowTestIds.TOKEN_BALANCE}
            >
              {formattedBalance}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              testID={MusdConversionAssetRowTestIds.TOKEN_NAME}
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
                isDisabled={areActionsDisabled}
                testID={MusdConversionAssetRowTestIds.MAX_BUTTON}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('earn.musd_conversion.max')}
                </Text>
              </Button>
              <ButtonIcon
                style={styles.editButton}
                iconName={IconName.Edit}
                size={ButtonIconSize.Lg}
                iconProps={{ size: IconSize.Sm }}
                onPress={handleEditPress}
                isDisabled={areActionsDisabled}
                testID={MusdConversionAssetRowTestIds.EDIT_BUTTON}
              />
            </>
          )}
        </View>
      </View>
      {errorMessage ? (
        <Text variant={TextVariant.BodySm} style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
};

export default MusdConversionAssetRow;
