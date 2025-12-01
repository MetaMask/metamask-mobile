import React, { useCallback, useEffect, useState } from 'react';
import {
  NativeSyntheticEvent,
  SafeAreaView,
  TextLayoutEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { getNftDetailsNavbarOptions } from '../../UI/Navbar';
import Text from '../../../component-library/components/Texts/Text/Text';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NftDetails.styles';
import Routes from '../../../constants/navigation/Routes';
import { NftDetailsParams } from './NftDetails.types';
import { ScrollView } from 'react-native-gesture-handler';
import StyledButton from '../../../components/UI/StyledButton';
import NftDetailsBox from './NftDetailsBox';
import NftDetailsInformationRow from './NftDetailsInformationRow';
import { renderShortAddress } from '../../../util/address';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { useDispatch, useSelector } from 'react-redux';
import { showAlert } from '../../../actions/alert';
import { strings } from '../../../../locales/i18n';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import etherscanLink from '@metamask/etherscan-link';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { formatCurrency } from '../../../util/confirm-tx';
import { newAssetTransaction } from '../../../actions/transaction';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import ContentDisplay from '../../../components/UI/AssetOverview/AboutAsset/ContentDisplay';
import BigNumber from 'bignumber.js';
import { getDecimalChainId } from '../../../util/networks';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { renderShortText } from '../../../util/general';
import { prefixUrlWithProtocol } from '../../../util/browser';
import { formatTimestampToYYYYMMDD } from '../../../util/date';
import MAX_TOKEN_ID_LENGTH from './nftDetails.utils';
import Engine from '../../../core/Engine';
import { toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { InitSendLocation } from '../confirmations/constants/send';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';

const NftDetails = () => {
  const navigation = useNavigation();
  const { collectible, source } = useParams<NftDetailsParams>();
  const chainId = useSelector(selectChainId);
  const dispatch = useDispatch();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectEvmTicker);
  const { trackEvent, createEventBuilder } = useMetrics();
  const selectedNativeConversionRate = useSelector(selectConversionRate);
  const { navigateToSendPage } = useSendNavigation();
  const hasLastSalePrice = Boolean(
    collectible.lastSale?.price?.amount?.usd &&
      collectible.lastSale?.price?.amount?.native,
  );
  const hasFloorAskPrice = Boolean(
    collectible.collection?.floorAsk?.price?.amount?.usd &&
      collectible.collection?.floorAsk?.price?.amount?.native,
  );
  const hasOnlyContractAddress =
    !hasLastSalePrice && !hasFloorAskPrice && !collectible?.rarityRank;

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getNftDetailsNavbarOptions(
        navigation,
        colors,
        () =>
          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: 'NftOptions',
            params: {
              collectible,
            },
          }),
        undefined,
      ),
    );
  }, [collectible, colors, navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NFT_DETAILS_OPENED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
          ...(source && { source }),
        })
        .build(),
    );
    // The linter wants `trackEvent` to be added as a dependency,
    // But the event fires twice if I do that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, source]);

  const viewHighestFloorPriceSource = () => {
    const url =
      hasFloorAskPrice &&
      Boolean(collectible?.collection?.floorAsk?.source?.url)
        ? collectible?.collection?.floorAsk?.source?.url
        : undefined;

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: { url },
    });
  };

  const viewLastSalePriceSource = () => {
    const source = collectible?.lastSale?.orderSource;
    if (source) {
      const url = prefixUrlWithProtocol(source);
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: { url },
      });
    }
  };

  const copyAddressToClipboard = async (address?: string) => {
    if (!address) {
      return;
    }
    await ClipboardManager.setString(address);
    dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: { msg: strings('detected_tokens.address_copied_to_clipboard') },
      }),
    );
  };

  const blockExplorerTokenLink = () =>
    etherscanLink.createTokenTrackerLink(collectible?.address, chainId);

  const blockExplorerAccountLink = () => {
    if (collectible.collection?.creator) {
      return etherscanLink.createAccountLink(
        collectible?.collection?.creator,
        chainId,
      );
    }
  };

  const getDateCreatedTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return Math.floor(date.getTime() / 1000);
  };

  const onSend = useCallback(async () => {
    const chainIdHex = toHex(collectible?.chainId as number) as Hex;
    if (chainIdHex !== chainId) {
      const { NetworkController, MultichainNetworkController } = Engine.context;
      const networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(chainIdHex);

      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;

      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );
    }
    dispatch(
      newAssetTransaction({ contractName: collectible.name, ...collectible }),
    );
    navigateToSendPage({
      location: InitSendLocation.NftDetails,
      asset: collectible,
    });
  }, [collectible, chainId, dispatch, navigateToSendPage]);

  const isTradable = useCallback(
    () =>
      collectible.standard === 'ERC721' &&
      collectible.isCurrentlyOwned === true,
    [collectible],
  );

  const getCurrentHighestBidValue = () => {
    if (
      collectible?.topBid?.price?.amount?.native &&
      collectible.collection?.topBid?.price?.amount?.native
    ) {
      // return the max between collection top Bid and token topBid
      const topBidValue = Math.max(
        collectible?.topBid?.price?.amount?.native,
        collectible.collection?.topBid?.price?.amount?.native,
      );
      return `${topBidValue}${ticker}`;
    }
    // return the one that is available
    const topBidValue =
      collectible.topBid?.price?.amount?.native ||
      collectible.collection?.topBid?.price?.amount?.native;
    if (!topBidValue) {
      return null;
    }
    return `${topBidValue}${ticker}`;
  };

  const getTopBidSourceDomain = () =>
    collectible?.topBid?.source?.url ||
    (collectible?.collection?.topBid?.sourceDomain
      ? `https://${collectible?.collection.topBid?.sourceDomain}`
      : undefined);

  const [numberOfLines, setNumberOfLines] = useState(0);

  const handleTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    setNumberOfLines(event.nativeEvent.lines.length);
  };

  const renderDescription = () => {
    if (!collectible.description) {
      return null;
    } else if (numberOfLines <= 2) {
      // Render Text component if lines are less than or equal to 2
      return (
        <Text style={styles.description} onTextLayout={handleTextLayout}>
          {collectible.description}
        </Text>
      );
    }
    return (
      <ContentDisplay
        content={collectible?.description}
        numberOfLines={3}
        textStyle={styles.description}
      />
    );
  };

  const applyConversionRate = (value: BigNumber, rate?: number) => {
    if (typeof rate === 'undefined') {
      return value;
    }

    const conversionRate = new BigNumber(rate, 10);
    return value.times(conversionRate);
  };

  const getValueInFormattedCurrency = (
    nativeValue: number,
    usdValue: number,
  ) => {
    const numericVal = new BigNumber(nativeValue, 10);
    // if current currency is usd or if fetching conversion rate failed then always return USD value
    if (!selectedNativeConversionRate || currentCurrency === 'usd') {
      const usdValueFormatted = formatCurrency(usdValue.toString(), 'usd');
      return usdValueFormatted;
    }
    const value = applyConversionRate(
      numericVal,
      selectedNativeConversionRate,
    ).toNumber();
    return formatCurrency(new BigNumber(value, 10).toString(), currentCurrency);
  };

  const getFormattedDate = (dateString: number) => {
    const date = new Date(dateString * 1000).getTime();
    return formatTimestampToYYYYMMDD(date);
  };

  const onMediaPress = useCallback(() => {
    // Navigate to new NFT details page
    navigation.navigate('NftDetailsFullImage', {
      collectible,
    });
  }, [collectible, navigation]);

  const goToTokenIdSheet = (tokenId: string) => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_TOKEN_ID,
      params: {
        tokenId,
      },
    });
  };

  const shouldShowTokenIdBottomSheet = (tokenId: string) =>
    tokenId.length > MAX_TOKEN_ID_LENGTH;

  const hasPriceSection =
    getCurrentHighestBidValue() || collectible?.lastSale?.timestamp;
  const hasCollectionSection =
    collectible?.collection?.name ||
    collectible?.collection?.tokenCount ||
    collectible?.collection?.creator;
  const hasAttributesSection =
    collectible?.attributes && collectible?.attributes?.length !== 0;

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView>
        <View style={styles.infoContainer}>
          <TouchableOpacity
            style={[styles.collectibleMediaWrapper]}
            onPress={onMediaPress}
          >
            <CollectibleMedia
              style={styles.collectibleMediaStyle}
              cover
              renderAnimation
              collectible={collectible}
              isTokenImage
              isFullRatio
            />
          </TouchableOpacity>
          <View>
            <View style={styles.nameWrapper}>
              <Text style={styles.heading}>{collectible.name}</Text>
              {collectible.collection?.openseaVerificationStatus ===
              'verified' ? (
                <Icon
                  name={IconName.SecurityTick}
                  size={IconSize.Md}
                  style={styles.iconVerified}
                />
              ) : null}
            </View>
            {renderDescription()}
          </View>
          <View style={styles.generalInfoFrame}>
            {hasLastSalePrice || hasFloorAskPrice ? (
              <>
                <NftDetailsBox
                  titleTextStyle={styles.generalInfoTitleTextStyle}
                  titleStyle={styles.generalInfoTitleStyle}
                  valueStyle={styles.generalInfoValueStyle}
                  title={strings('nft_details.bought_for')}
                  value={
                    collectible.lastSale?.price?.amount?.native &&
                    collectible.lastSale?.price?.amount?.usd
                      ? getValueInFormattedCurrency(
                          collectible.lastSale?.price?.amount?.native,
                          collectible.lastSale?.price?.amount?.usd,
                        )
                      : strings('nft_details.data_unavailable')
                  }
                  valueTextStyle={
                    hasLastSalePrice
                      ? styles.generalInfoValueTextStyle
                      : styles.generalInfoTitleTextStyle
                  }
                  icon={
                    hasLastSalePrice && collectible?.lastSale?.orderSource ? (
                      <TouchableOpacity
                        onPress={() => viewLastSalePriceSource()}
                      >
                        <Icon
                          name={IconName.Export}
                          size={IconSize.Xs}
                          style={styles.iconExport}
                        />
                      </TouchableOpacity>
                    ) : null
                  }
                />
                <NftDetailsBox
                  titleTextStyle={styles.generalInfoTitleTextStyle}
                  titleStyle={styles.generalInfoTitleStyle}
                  valueStyle={styles.generalInfoValueStyle}
                  title={strings('nft_details.highest_floor_price')}
                  value={
                    collectible.collection?.floorAsk?.price?.amount?.native &&
                    collectible.collection?.floorAsk?.price?.amount?.usd
                      ? getValueInFormattedCurrency(
                          collectible.collection?.floorAsk?.price?.amount
                            ?.native,
                          collectible.collection?.floorAsk?.price?.amount?.usd,
                        )
                      : strings('nft_details.price_unavailable')
                  }
                  valueTextStyle={
                    hasFloorAskPrice
                      ? styles.generalInfoValueTextStyle
                      : styles.generalInfoTitleTextStyle
                  }
                  icon={
                    hasFloorAskPrice ? (
                      <TouchableOpacity
                        onPress={() => viewHighestFloorPriceSource()}
                      >
                        <Icon
                          name={IconName.Export}
                          size={IconSize.Xs}
                          style={styles.iconExport}
                        />
                      </TouchableOpacity>
                    ) : null
                  }
                />
              </>
            ) : null}

            {collectible.rarityRank ? (
              <NftDetailsBox
                titleTextStyle={styles.generalInfoTitleTextStyle}
                titleStyle={styles.generalInfoTitleStyle}
                valueStyle={styles.generalInfoValueStyle}
                title={strings('nft_details.rank')}
                value={`#${collectible.rarityRank}`}
                valueTextStyle={styles.generalInfoValueTextStyle}
              />
            ) : null}
            {hasLastSalePrice || hasFloorAskPrice || collectible?.rarityRank ? (
              <NftDetailsBox
                titleTextStyle={styles.generalInfoTitleTextStyle}
                titleStyle={styles.generalInfoTitleStyle}
                valueStyle={styles.generalInfoValueStyle}
                title={strings('nft_details.contract_address')}
                value={renderShortAddress(collectible.address)}
                valueTextStyle={styles.generalInfoValueTextAddressStyle}
                icon={
                  <TouchableOpacity
                    onPress={() => copyAddressToClipboard(collectible.address)}
                  >
                    <Icon
                      name={IconName.Copy}
                      size={IconSize.Xs}
                      color={colors.primary.default}
                    />
                  </TouchableOpacity>
                }
                onValuePress={() => {
                  navigation.navigate('Webview', {
                    screen: 'SimpleWebview',
                    params: {
                      url: blockExplorerTokenLink(),
                    },
                  });
                }}
              />
            ) : null}
          </View>
          {hasOnlyContractAddress ? (
            <NftDetailsInformationRow
              title={strings('nft_details.contract_address')}
              value={renderShortAddress(collectible.address)}
              titleStyle={styles.informationRowTitleStyle}
              valueStyle={styles.informationRowValueAddressStyle}
              icon={
                <TouchableOpacity
                  onPress={() => copyAddressToClipboard(collectible.address)}
                  style={styles.iconPadding}
                >
                  <Icon
                    name={IconName.Copy}
                    size={IconSize.Xs}
                    color={colors.primary.default}
                  />
                </TouchableOpacity>
              }
              onValuePress={() => {
                if (collectible.collection?.creator) {
                  navigation.navigate('Webview', {
                    screen: 'SimpleWebview',
                    params: {
                      url: blockExplorerTokenLink(),
                    },
                  });
                }
              }}
            />
          ) : null}

          <NftDetailsInformationRow
            title={strings('nft_details.token_id')}
            value={
              shouldShowTokenIdBottomSheet(collectible.tokenId)
                ? renderShortText(collectible.tokenId, 5)
                : collectible.tokenId
            }
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
            icon={
              shouldShowTokenIdBottomSheet(collectible.tokenId) ? (
                <TouchableOpacity
                  onPress={() => goToTokenIdSheet(collectible.tokenId)}
                  style={styles.iconPadding}
                >
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Xs}
                    color={colors.text.default}
                  />
                </TouchableOpacity>
              ) : null
            }
          />
          <NftDetailsInformationRow
            title={strings('nft_details.token_symbol')}
            value={collectible?.collection?.symbol}
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />
          <NftDetailsInformationRow
            title={strings('nft_details.token_standard')}
            value={collectible.standard}
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />
          <NftDetailsInformationRow
            title={strings('nft_details.date_created')}
            value={
              collectible.collection?.contractDeployedAt
                ? getFormattedDate(
                    getDateCreatedTimestamp(
                      collectible.collection?.contractDeployedAt,
                    ),
                  )
                : undefined
            }
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />
          {hasCollectionSection ? (
            <Text style={styles.heading}>
              {strings('collectible.collection')}
            </Text>
          ) : null}

          <NftDetailsInformationRow
            title={strings('nft_details.unique_token_holders')}
            value={collectible.collection?.ownerCount}
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />
          <NftDetailsInformationRow
            title={strings('nft_details.tokens_in_collection')}
            value={collectible?.collection?.tokenCount}
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />
          <NftDetailsInformationRow
            title={strings('nft_details.creator_address')}
            value={
              collectible?.collection?.creator
                ? renderShortAddress(collectible?.collection?.creator)
                : null
            }
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={
              collectible.collection?.creator
                ? styles.informationRowValueAddressStyle
                : styles.informationRowValueStyle
            }
            icon={
              <TouchableOpacity
                onPress={() =>
                  copyAddressToClipboard(collectible?.collection?.creator)
                }
                style={styles.iconPadding}
              >
                <Icon
                  name={IconName.Copy}
                  size={IconSize.Xs}
                  color={colors.primary.default}
                />
              </TouchableOpacity>
            }
            onValuePress={() => {
              if (collectible.collection?.creator) {
                navigation.navigate('Webview', {
                  screen: 'SimpleWebview',
                  params: {
                    url: blockExplorerAccountLink(),
                  },
                });
              }
            }}
          />

          {hasPriceSection ? <Text style={styles.heading}>Price</Text> : null}
          <NftDetailsInformationRow
            title={strings('nft_details.last_sold')}
            value={
              collectible.lastSale?.timestamp
                ? getFormattedDate(collectible.lastSale?.timestamp)
                : null
            }
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
          />

          <NftDetailsInformationRow
            title={strings('nft_details.highest_current_bid')}
            value={getCurrentHighestBidValue()}
            titleStyle={styles.informationRowTitleStyle}
            valueStyle={styles.informationRowValueStyle}
            icon={
              getTopBidSourceDomain() ? (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('Webview', {
                      screen: 'SimpleWebview',
                      params: { url: getTopBidSourceDomain() },
                    });
                  }}
                >
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Xs}
                    style={styles.iconExport}
                  />
                </TouchableOpacity>
              ) : null
            }
          />

          {hasAttributesSection ? (
            <Text style={styles.heading}>
              {strings('nft_details.attributes')}
            </Text>
          ) : null}

          {collectible?.attributes?.length !== 0 ? (
            <View style={styles.generalInfoFrame}>
              {collectible.attributes?.map((elm, idx) => {
                const { key, value } = elm;
                return (
                  <NftDetailsBox
                    key={`${key}-${value}-${idx}`}
                    title={key}
                    value={value}
                    titleTextStyle={styles.informationRowTitleStyle}
                    valueTextStyle={styles.informationRowValueStyle}
                  />
                );
              })}
            </View>
          ) : null}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              {strings('nft_details.disclaimer')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {isTradable() ? (
        <View style={styles.buttonSendWrapper}>
          <StyledButton
            type={'confirm'}
            containerStyle={styles.buttonSend}
            onPress={onSend}
            disabled={false} // TODO check why ERC1155 is still disabled on mobile
          >
            {strings('transaction.send')}
          </StyledButton>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default NftDetails;
