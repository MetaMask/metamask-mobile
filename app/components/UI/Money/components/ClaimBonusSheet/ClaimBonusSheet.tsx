import React, { useCallback, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
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
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import styleSheet from './ClaimBonusSheet.styles';
import { ClaimBonusSheetTestIds } from './ClaimBonusSheet.testIds';

const CLAIM_CHAIN_ID = CHAIN_IDS.LINEA_MAINNET as Hex;

export interface ClaimBonusSheetRouteParams {
  /** Claimable reward, formatted as a numeric mUSD string (e.g. "3.65"). */
  claimableReward: string | null;
  /**
   * Caller-supplied claim dispatcher. The sheet must invoke the *parent's*
   * `claimRewards` rather than calling its own `useMerklBonusClaim` instance,
   * otherwise the post-claim session lock — set via setState inside the
   * dispatcher — is lost when the sheet unmounts before the tx resolves, and
   * the parent CTAs would re-enable themselves before the next rewards
   * refetch lands, allowing duplicate claim attempts.
   */
  onConfirm: () => void;
}

const RowText: React.FC<{
  children: React.ReactNode;
  testID?: string;
}> = ({ children, testID }) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextDefault}
    testID={testID}
  >
    {children}
  </Text>
);

const LabelWithInfo: React.FC<{
  label: string;
  style: ViewStyle;
}> = ({ label, style }) => (
  <View style={style}>
    <RowText>{label}</RowText>
    <Icon
      name={IconName.Question}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
    />
  </View>
);

const ClaimBonusSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: ClaimBonusSheetRouteParams }, 'params'>>();
  const claimableReward = route.params?.claimableReward ?? null;
  const onConfirm = route.params?.onConfirm;
  const { styles } = useStyles(styleSheet, {});

  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const lineaNetwork = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, CLAIM_CHAIN_ID),
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      onConfirm?.();
    });
  }, [onConfirm]);

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
              <RowText>
                {strings('money.claim_bonus_sheet.claiming_to')}
              </RowText>
              <RowText testID={ClaimBonusSheetTestIds.ACCOUNT_VALUE}>
                {accountName}
              </RowText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <LabelWithInfo
                label={strings('money.claim_bonus_sheet.network')}
                style={styles.rowLabel}
              />
              <View style={styles.rowValue}>
                <Badge
                  variant={BadgeVariant.Network}
                  size={AvatarSize.Xs}
                  isScaled={false}
                  imageSource={networkImageSource}
                />
                <RowText testID={ClaimBonusSheetTestIds.NETWORK_VALUE}>
                  {networkName}
                </RowText>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <LabelWithInfo
                label={strings('money.claim_bonus_sheet.network_fee')}
                style={styles.rowLabel}
              />
              <RowText testID={ClaimBonusSheetTestIds.NETWORK_FEE_VALUE}>
                {strings('money.claim_bonus_sheet.network_fee_estimate')}
              </RowText>
            </View>
            <View style={styles.row}>
              <RowText>{strings('money.claim_bonus_sheet.speed')}</RowText>
              <RowText>
                {strings('money.claim_bonus_sheet.speed_market')}
              </RowText>
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
