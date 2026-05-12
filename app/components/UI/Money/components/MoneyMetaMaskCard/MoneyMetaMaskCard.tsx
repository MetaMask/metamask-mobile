import React, { useCallback } from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import styles from './MoneyMetaMaskCard.styles';

import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

interface MoneyMetaMaskCardProps {
  /**
   * 'upsell' (default): virtual/metal card rows.
   * 'link': card-linking CTA layout.
   * 'manage': cardholder management layout with available balance and metal upsell.
   */
  mode?: 'upsell' | 'link' | 'manage';
  onGetNowPress: () => void;
  onHeaderPress?: () => void;
  /** Called when the "Link card" button is pressed (link mode only). */
  onLinkPress?: () => void;
  /** Called when the "Manage" button is pressed (manage mode only). */
  onManagePress?: () => void;
  /**
   * Whether to render the Metal card row in upsell mode. Defaults to `false`
   * because the Metal card is currently only available to US users; the parent
   * is expected to pass the geolocation-derived flag.
   */
  showMetalCard?: boolean;
  /** User's available card balance (manage mode only). */
  cardBalance?: string;
}

const CardRow = ({
  imageSource,
  cardName,
  cashbackPercentage,
  onPress,
  testID,
}: {
  imageSource: ImageSourcePropType;
  cardName: string;
  cashbackPercentage: string;
  onPress: () => void;
  testID: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    testID={testID}
    twClassName="py-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4"
    >
      <Image source={imageSource} style={styles.cardImage} />
      <Box twClassName="gap-2">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {cardName}
        </Text>
        <Tag severity={TagSeverity.Success}>
          {strings('money.metamask_card.cashback', {
            percentage: cashbackPercentage,
          })}
        </Tag>
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onPress}
      twClassName="self-center"
    >
      {strings('money.metamask_card.get_now')}
    </Button>
  </Box>
);

const CheckBullet = ({ text, testID }: { text: string; testID: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="self-start gap-1 rounded bg-muted px-1.5"
    testID={testID}
  >
    <Icon
      name={IconName.Check}
      size={IconSize.Sm}
      color={IconColor.SuccessDefault}
    />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.SuccessDefault}
    >
      {text}
    </Text>
  </Box>
);

const LinkContent = ({
  onLinkPress,
  showMetalCard,
}: {
  onLinkPress: () => void;
  showMetalCard: boolean;
}) => (
  <Box twClassName="gap-6">
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      testID={MoneyMetaMaskCardTestIds.LINK_SUBTITLE}
    >
      {strings('money.metamask_card.link_subtitle')}
    </Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4"
      testID={MoneyMetaMaskCardTestIds.LINK_CONTAINER}
    >
      <Image
        source={showMetalCard ? mmCardMetal : mmCardRegular}
        style={styles.linkCardImage}
        testID={MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE}
      />
      <Box twClassName="gap-2 flex-1 justify-center">
        <CheckBullet
          text={strings('money.metamask_card.link_bullet_cashback', {
            percentage: showMetalCard ? '3' : '1',
          })}
          testID={MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK}
        />
        <CheckBullet
          text={strings('money.metamask_card.link_bullet_apy')}
          testID={MoneyMetaMaskCardTestIds.LINK_BULLET_APY}
        />
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isFullWidth
      onPress={onLinkPress}
      testID={MoneyMetaMaskCardTestIds.LINK_BUTTON}
      twClassName="mt-3"
    >
      {strings('money.metamask_card.link_card')}
    </Button>
  </Box>
);

const ManageRow = ({
  imageSource,
  title,
  subtitle,
  cashbackPercentage,
  ctaLabel,
  onPress,
  containerTestID,
  ctaTestID,
  subtitleTestID,
}: {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle?: string;
  cashbackPercentage: string;
  ctaLabel: string;
  onPress: () => void;
  containerTestID: string;
  ctaTestID: string;
  subtitleTestID?: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    testID={containerTestID}
    twClassName="py-3 gap-3"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3 flex-1"
    >
      <Image source={imageSource} style={styles.manageCardImage} />
      <Box twClassName="gap-1 flex-1">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            testID={subtitleTestID}
          >
            {subtitle}
          </Text>
        ) : null}
        <Tag severity={TagSeverity.Success}>
          {strings('money.metamask_card.cashback', {
            percentage: cashbackPercentage,
          })}
        </Tag>
      </Box>
    </Box>
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onPress}
      testID={ctaTestID}
    >
      {ctaLabel}
    </Button>
  </Box>
);

const ManageContent = ({
  cardBalance,
  onManagePress,
  onGetNowPress,
}: {
  cardBalance: string;
  onManagePress: () => void;
  onGetNowPress: () => void;
}) => (
  <Box twClassName="gap-2" testID={MoneyMetaMaskCardTestIds.MANAGE_CONTAINER}>
    <ManageRow
      imageSource={mmCardRegular}
      title={strings('money.metamask_card.avail_balance')}
      subtitle={cardBalance}
      cashbackPercentage="1"
      ctaLabel={strings('money.metamask_card.manage_card')}
      onPress={onManagePress}
      containerTestID={MoneyMetaMaskCardTestIds.MANAGE_BALANCE_ROW}
      ctaTestID={MoneyMetaMaskCardTestIds.MANAGE_BUTTON}
      subtitleTestID={MoneyMetaMaskCardTestIds.MANAGE_BALANCE}
    />
    <ManageRow
      imageSource={mmCardMetal}
      title={strings('money.metamask_card.metal_card')}
      cashbackPercentage="3"
      ctaLabel={strings('money.metamask_card.get_now')}
      onPress={onGetNowPress}
      containerTestID={MoneyMetaMaskCardTestIds.MANAGE_METAL_ROW}
      ctaTestID={MoneyMetaMaskCardTestIds.MANAGE_METAL_GET_NOW}
    />
  </Box>
);

const MoneyMetaMaskCard = ({
  mode = 'upsell',
  onGetNowPress,
  onHeaderPress,
  onLinkPress,
  onManagePress,
  showMetalCard = false,
  cardBalance,
}: MoneyMetaMaskCardProps) => {
  const handleLinkPress = useCallback(() => onLinkPress?.(), [onLinkPress]);
  const handleManagePress = useCallback(
    () => onManagePress?.(),
    [onManagePress],
  );

  let content: React.ReactNode = null;
  if (mode === 'link') {
    content = (
      <LinkContent
        onLinkPress={handleLinkPress}
        showMetalCard={showMetalCard}
      />
    );
  } else if (mode === 'manage') {
    content = (
      <ManageContent
        cardBalance={cardBalance ?? ''}
        onManagePress={handleManagePress}
        onGetNowPress={onGetNowPress}
      />
    );
  } else {
    content = (
      <>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('money.metamask_card.subtitle')}
        </Text>
        <CardRow
          imageSource={mmCardRegular}
          cardName={strings('money.metamask_card.virtual_card')}
          cashbackPercentage="1"
          onPress={onGetNowPress}
          testID={MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW}
        />
        {showMetalCard && (
          <CardRow
            imageSource={mmCardMetal}
            cardName={strings('money.metamask_card.metal_card')}
            cashbackPercentage="3"
            onPress={onGetNowPress}
            testID={MoneyMetaMaskCardTestIds.METAL_CARD_ROW}
          />
        )}
      </>
    );
  }

  let headerTitleKey: string;
  if (mode === 'link') {
    headerTitleKey = 'money.metamask_card.link_title';
  } else {
    headerTitleKey = 'money.metamask_card.title';
  }

  return (
    <Box
      twClassName="px-4 py-3 gap-3"
      testID={MoneyMetaMaskCardTestIds.CONTAINER}
    >
      <MoneySectionHeader
        title={strings(headerTitleKey)}
        onPress={onHeaderPress}
      />
      {content}
    </Box>
  );
};

export default MoneyMetaMaskCard;
