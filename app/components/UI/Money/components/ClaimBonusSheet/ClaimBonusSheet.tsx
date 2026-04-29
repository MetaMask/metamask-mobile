import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../../util/networks';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { LINEA_MUSD_ASSET_FOR_MERKL } from '../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import styleSheet from './ClaimBonusSheet.styles';
import { ClaimBonusSheetTestIds } from './ClaimBonusSheet.testIds';

const CLAIM_CHAIN_ID = CHAIN_IDS.LINEA_MAINNET as Hex;

export interface ClaimBonusSheetRouteParams {
  /**
   * Analytics location of the surface that opened the sheet. Forwarded to
   * `useMerklBonusClaim` so claim CTAs from the Wallet Home Cash row vs. the
   * Money Hub bonus card report distinct origins.
   */
  location?: string;
}

const ClaimBonusSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: ClaimBonusSheetRouteParams }, 'params'>>();
  const location =
    route.params?.location ??
    MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.HOME_CASH_SECTION;
  const { styles } = useStyles(styleSheet, {});

  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const lineaNetwork = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, CLAIM_CHAIN_ID),
  );

  const { claimableReward, claimRewards } = useMerklBonusClaim(
    LINEA_MUSD_ASSET_FOR_MERKL,
    location,
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      claimRewards().catch(() => undefined);
    });
  }, [claimRewards]);

  const networkImageSource = getNetworkImageSource({ chainId: CLAIM_CHAIN_ID });
  const networkName = lineaNetwork?.name ?? strings('networks.linea_mainnet');
  const accountAddress = selectedAccount?.address ?? '';
  const truncatedAddress = accountAddress
    ? `${accountAddress.slice(0, 6)}…${accountAddress.slice(-4)}`
    : '';
  const accountName = selectedAccount?.metadata?.name || truncatedAddress;
  const tokenAmount = claimableReward
    ? `${claimableReward} ${MUSD_TOKEN.symbol}`
    : `— ${MUSD_TOKEN.symbol}`;
  const fiatAmount = claimableReward ? `$${claimableReward}` : '—';

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={ClaimBonusSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleCancel}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.claim_bonus_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('money.claim_bonus_sheet.subtitle')}
        </Text>

        <View style={styles.amountBlock}>
          <View style={styles.amountAvatar}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  size={AvatarSize.Xs}
                  isScaled={false}
                  imageSource={networkImageSource}
                />
              }
            >
              <AvatarToken
                name={MUSD_TOKEN.symbol}
                src={MUSD_TOKEN.imageSource as number}
                size={AvatarTokenSize.Xl}
              />
            </BadgeWrapper>
          </View>
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            testID={ClaimBonusSheetTestIds.AMOUNT_TOKEN}
          >
            {tokenAmount}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={ClaimBonusSheetTestIds.AMOUNT_FIAT}
          >
            {fiatAmount}
          </Text>
        </View>

        <View style={styles.cardGroup}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('money.claim_bonus_sheet.claiming_to')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                testID={ClaimBonusSheetTestIds.ACCOUNT_VALUE}
              >
                {accountName}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('money.claim_bonus_sheet.network')}
                </Text>
                <Icon
                  name={IconName.Question}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </View>
              <View style={styles.rowValue}>
                <Badge
                  variant={BadgeVariant.Network}
                  size={AvatarSize.Xs}
                  isScaled={false}
                  imageSource={networkImageSource}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  testID={ClaimBonusSheetTestIds.NETWORK_VALUE}
                >
                  {networkName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('money.claim_bonus_sheet.network_fee')}
                </Text>
                <Icon
                  name={IconName.Question}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </View>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                testID={ClaimBonusSheetTestIds.NETWORK_FEE_VALUE}
              >
                {strings('money.claim_bonus_sheet.network_fee_estimate')}
              </Text>
            </View>
            <View style={styles.row}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('money.claim_bonus_sheet.speed')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('money.claim_bonus_sheet.speed_market')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerButton}>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleCancel}
              testID={ClaimBonusSheetTestIds.CANCEL_BUTTON}
            >
              {strings('money.claim_bonus_sheet.cancel')}
            </Button>
          </View>
          <View style={styles.footerButton}>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleConfirm}
              isDisabled={!claimableReward}
              testID={ClaimBonusSheetTestIds.CONFIRM_BUTTON}
            >
              {strings('money.claim_bonus_sheet.confirm')}
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ClaimBonusSheet;
