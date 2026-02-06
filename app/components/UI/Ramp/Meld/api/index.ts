/**
 * Singleton Meld API instance for the PoC.
 *
 * Reads the API key from the MELD_API_KEY environment variable.
 * Add `export MELD_API_KEY="your_key"` to .js.env
 *
 * In production, this would be replaced by a backend proxy to
 * avoid exposing the API key in the mobile app bundle.
 */

import MeldApi from './MeldApi';
import { MeldEnvironment } from '../types';
import Logger from '../../../../../util/Logger';

const meldApiKey: string = process.env.MELD_API_KEY || '';

if (!meldApiKey) {
  Logger.log(
    '[MeldApi] No MELD_API_KEY found. Add `export MELD_API_KEY="..."` to .js.env',
  );
}

const meldApi = new MeldApi({
  apiKey: meldApiKey,
  environment: MeldEnvironment.Sandbox,
});

export { MeldApi };
export default meldApi;
