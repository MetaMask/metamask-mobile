/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line import/no-nodejs-modules
import EventEmitter from 'events';
import { CLIENT_CONTEXT } from './constants';
import { Engine } from './controllers';
import { ISingleEthereum, SingleEthereumTypes } from './types';

export class SingleEthereum extends ISingleEthereum {
  public name: ISingleEthereum['name'];
  public core: ISingleEthereum['core'];
  public logger: ISingleEthereum['logger'];
  public events: ISingleEthereum['events'] = new EventEmitter();
  public engine: ISingleEthereum['engine'];
  public metadata: ISingleEthereum['metadata'];
  public chainId: ISingleEthereum['chainId'];
  public signConfig: ISingleEthereum['signConfig'];

  static async init(opts: SingleEthereumTypes.Options) {
    const client = new SingleEthereum(opts);
    await client.initialize();

    return client;
  }

  constructor(opts: SingleEthereumTypes.Options) {
    super(opts);
    this.metadata = opts.metadata;
    this.name = opts.name || CLIENT_CONTEXT;
    this.core = opts.core;
    this.logger = this.core.logger;
    this.chainId = opts.chainId;
    this.signConfig = opts.signConfig;
    this.engine = new Engine(this);
  }

  // ---------- Events ----------------------------------------------- //

  public on: ISingleEthereum['on'] = (name, listener) => this.events.on(name, listener);

  public once: ISingleEthereum['once'] = (name, listener) => this.events.once(name, listener);

  public off: ISingleEthereum['off'] = (name, listener) => this.events.off(name, listener);

  public removeListener: ISingleEthereum['removeListener'] = (name, listener) => this.events.removeListener(name, listener);

  // ---------- Engine ----------------------------------------------- //

  public pair: ISingleEthereum['pair'] = async (params) => {
    try {
      return await this.engine.pair(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public approveSession: ISingleEthereum['approveSession'] = async (params) => {
    try {
      return await this.engine.approveSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public rejectSession: ISingleEthereum['rejectSession'] = async (params) => {
    try {
      return await this.engine.rejectSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public updateSession: ISingleEthereum['updateSession'] = async (params) => {
    try {
      return await this.engine.updateSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public approveRequest: ISingleEthereum['approveRequest'] = async (params) => {
    try {
      return await this.engine.approveRequest(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public rejectRequest: ISingleEthereum['rejectRequest'] = async (params) => {
    try {
      return await this.engine.rejectRequest(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public disconnectSession: ISingleEthereum['disconnectSession'] = async (params) => {
    try {
      return await this.engine.disconnectSession(params);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getActiveSessions: ISingleEthereum['getActiveSessions'] = () => {
    try {
      return this.engine.getActiveSessions();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getPendingSessionProposals: ISingleEthereum['getPendingSessionProposals'] = () => {
    try {
      return this.engine.getPendingSessionProposals();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public getPendingSessionRequests: ISingleEthereum['getPendingSessionRequests'] = () => {
    try {
      return this.engine.getPendingSessionRequests();
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  // ---------- Auth ----------------------------------------------- //

  public approveAuthRequest: ISingleEthereum['approveAuthRequest'] = (payload) => {
    try {
      return this.engine.approveAuthRequest(payload);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  public rejectAuthRequest: ISingleEthereum['rejectAuthRequest'] = (payload) => {
    try {
      return this.engine.rejectAuthRequest(payload);
    } catch (error: any) {
      this.logger.error(error.message);
      throw error;
    }
  };

  // ---------- Private ----------------------------------------------- //

  private async initialize() {
    this.logger.trace('Initialized');
    try {
      await this.engine.init();
      this.logger.info('SingleEthereum Initialization Success');
    } catch (error: any) {
      this.logger.info('SingleEthereum Initialization Failure');
      this.logger.error(error.message);
      throw error;
    }
  }
}
