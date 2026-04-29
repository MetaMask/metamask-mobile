import type { AnalyticsExpectations } from '../../../framework';
import Assertions from '../../../framework/Assertions';
import { filterEvents } from '../helpers';
import { getRegionLocationCode } from '../../../framework/types';
import { RampsRegions, RampsRegionsEnum } from '../../../framework/Constants';
import { CustomNetworks } from '../../../resources/networks.e2e';
import { UnifiedRampRoutingType } from '../../../../app/reducers/fiatOrders/types';

const RAMPS_BUTTON_CLICKED = 'Ramps Button Clicked';
const RAMPS_TOKEN_SELECTED = 'Ramps Token Selected';

const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];
const expectedRegionId = getRegionLocationCode(selectedRegion);

/**
 * Basic expectations for the new user deposit flow — just checks events exist.
 */
export const onrampNewUserDepositExpectations: AnalyticsExpectations = {
  eventNames: [RAMPS_BUTTON_CLICKED, RAMPS_TOKEN_SELECTED],
  events: [{ name: RAMPS_BUTTON_CLICKED }, { name: RAMPS_TOKEN_SELECTED }],
};

/**
 * Detailed expectations for the returning user aggregator flow.
 * Includes property shape and value checks for both events.
 */
export const onrampReturningUserBuyExpectations: AnalyticsExpectations = {
  eventNames: [RAMPS_BUTTON_CLICKED, RAMPS_TOKEN_SELECTED],
  events: [
    {
      name: RAMPS_BUTTON_CLICKED,
      requiredDefinedPropertyKeys: [
        'location',
        'chain_id_destination',
        'ramp_type',
        'region',
        'ramp_routing',
      ],
      containProperties: {
        location: 'FundActionMenu',
        ramp_type: 'UNIFIED_BUY_2',
      },
    },
    {
      name: RAMPS_TOKEN_SELECTED,
      requiredProperties: {
        ramp_type: 'string',
        region: 'string',
        chain_id: 'string',
        currency_destination: 'string',
        currency_destination_symbol: 'string',
        currency_destination_network: 'string',
        currency_source: 'string',
        is_authenticated: 'boolean',
        token_caip19: 'string',
        token_symbol: 'string',
        ramp_routing: 'string',
      },
      containProperties: {
        token_symbol: 'ETH',
        token_caip19: 'eip155:1/slip44:60',
        currency_destination: 'eip155:1/slip44:60',
        currency_destination_symbol: 'ETH',
        currency_destination_network:
          CustomNetworks.Tenderly.Mainnet.providerConfig.nickname,
        ramp_routing: UnifiedRampRoutingType.DEPOSIT,
      },
    },
  ],
  validate: async ({ events }) => {
    // Verify region matches the GeolocationController's ISO 3166-2 code
    const rampsButtonClicked = filterEvents(events, RAMPS_BUTTON_CLICKED)[0];
    if (rampsButtonClicked) {
      await Assertions.checkIfTextMatches(
        rampsButtonClicked.properties.region as string,
        expectedRegionId,
      );
    }

    const rampsTokenSelected = filterEvents(events, RAMPS_TOKEN_SELECTED)[0];
    if (rampsTokenSelected) {
      await Assertions.checkIfTextMatches(
        rampsTokenSelected.properties.region as string,
        expectedRegionId,
      );
    }
  },
};
