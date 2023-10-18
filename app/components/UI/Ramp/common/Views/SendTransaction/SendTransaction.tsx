import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';

import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';
import ButtonConfirm from '../../components/ButtonConfirm';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../../../../component-library/components/Avatars/Avatar';
import RemoteImage from '../../../../../Base/RemoteImage';

import styleSheet from './SendTransaction.styles';
import imageIcons from '../../../../../../images/image-icons';

import { RootState } from '../../../../../../reducers';
import {
  getOrderById,
  getProviderName,
} from '../../../../../../reducers/fiatOrders';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  fromTokenMinimalUnitString,
  toTokenMinimalUnit,
} from '../../../../../../util/number';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';

interface SendTransactionParams {
  orderId?: string;
}

function SendTransaction() {
  const navigation = useNavigation();
  const params = useParams<SendTransactionParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const [isLoadingGas] = useState(false);

  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(styleSheet, {});

  const orderData = order?.data as Order;

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.send_transaction.sell_crypto',
          ),
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  const handleSend = useCallback(() => {
    //TODO
  }, []);

  if (!order) {
    return null;
  }

  let tokenIcon;
  const symbol = orderData.cryptoCurrency.symbol;
  if (symbol === 'ETH') {
    tokenIcon = imageIcons.ETHEREUM;
  } else if (Object.keys(imageIcons).includes(symbol)) {
    tokenIcon = imageIcons[symbol as keyof typeof imageIcons];
  } else {
    tokenIcon = { uri: orderData.cryptoCurrency.logo };
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <View style={styles.content}>
            <Row>
              <Text style={styles.centered}>
                <Text variant={TextVariant.HeadingMD} style={styles.normal}>
                  Send{' '}
                </Text>
                <Text variant={TextVariant.HeadingMD}>
                  {fromTokenMinimalUnitString(
                    toTokenMinimalUnit(
                      order.cryptoAmount || '0',
                      orderData.cryptoCurrency.decimals,
                    ).toString(),
                    orderData.cryptoCurrency.decimals,
                  )}{' '}
                </Text>
                <Avatar
                  size={AvatarSize.Sm}
                  variant={AvatarVariants.Token}
                  name={order.cryptocurrency}
                  imageSource={tokenIcon}
                />{' '}
                <Text variant={TextVariant.HeadingMD}>
                  {order.cryptocurrency}
                </Text>
              </Text>
            </Row>

            <Icon
              name={IconName.Arrow2Down}
              size={IconSize.Lg}
              color={IconColor.Alternative}
            />

            <Row>
              {orderData.provider?.logos?.[themeAppearance] ? (
                <RemoteImage
                  style={{
                    width: orderData.provider.logos.width,
                    height: orderData.provider.logos.height,
                  }}
                  source={{ uri: orderData.provider.logos[themeAppearance] }}
                />
              ) : (
                <Text variant={TextVariant.BodyMDBold}>
                  {orderData.provider.name}
                </Text>
              )}
            </Row>
          </View>
          <Row last />
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row first>
            <Text style={styles.centered} variant={TextVariant.BodyMD}>
              {strings(
                'fiat_on_ramp_aggregator.send_transaction.send_description',
                {
                  cryptocurrency: order?.cryptocurrency,
                  provider: getProviderName(order.provider, order?.data),
                  paymentMethod: orderData.paymentMethod.name,
                },
              )}
            </Text>
          </Row>

          <Row>
            <ButtonConfirm onLongPress={handleSend} disabled={isLoadingGas} />
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
}

export default SendTransaction;
