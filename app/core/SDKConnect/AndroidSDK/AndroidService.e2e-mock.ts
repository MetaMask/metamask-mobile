import DevLogger from '../utils/DevLogger';

export default class AndroidService {
  // To keep track in order to get the associated bridge to handle batch rpc calls
  public currentClientId?: string;

  constructor() {
    DevLogger.log(`MOCK AndroidService::constructor`);
    return;
  }
}
