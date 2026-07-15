import { getAllNetworks } from '../../../../util/networks';

export const allNetworks = getAllNetworks();

const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
export const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export const CHAIN_LIST_URL = 'https://chainid.network/';
