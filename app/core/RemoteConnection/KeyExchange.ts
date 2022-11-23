// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { EventEmitter2 } from 'eventemitter2';
import ECIES from './ECIES';

enum KeySteps {
  NONE = 'none',
  SYN = 'key_handshake_SYN',
  SYNACK = 'key_handshake_SYNACK',
  ACK = 'key_handshake_ACK',
}

export default class KeyExchange extends EventEmitter2 {
  keysExchanged = false;

  myECIES = null;

  otherPublicKey = '';

  CommLayer: any;

  myPublicKey: any;

  sendPublicKey: any;

  step: string = KeySteps.NONE;

  constructor({ CommLayer, otherPublicKey, sendPublicKey }) {
    super();

    this.myECIES = new ECIES();
    this.myECIES.generateECIES();
    this.CommLayer = CommLayer;
    this.myPublicKey = this.myECIES.getPublicKey();

    if (otherPublicKey) {
      this.onOtherPublicKey(otherPublicKey);
    }
    this.sendPublicKey = sendPublicKey;

    this.CommLayer.on('key_exchange', ({ message }) => {
      if (this.keysExchanged) {
        return;
      }

      if (message.type === KeySteps.SYN) {
        this.checkStep(KeySteps.NONE);
        this.step = KeySteps.ACK;

        if (this.sendPublicKey && message.pubkey && !this.otherPublicKey) {
          this.onOtherPublicKey(message.pubkey);
        }

        this.CommLayer.sendMessage({
          type: KeySteps.SYNACK,
          pubkey: this.myPublicKey,
        });
      } else if (message.type === KeySteps.SYNACK) {
        this.checkStep(KeySteps.SYNACK);

        this.onOtherPublicKey(message.pubkey);

        this.CommLayer.sendMessage({ type: KeySteps.ACK });
        this.keysExchanged = true;
        this.emit('keys_exchanged');
      } else if (message.type === KeySteps.ACK) {
        this.checkStep(KeySteps.ACK);
        this.keysExchanged = true;
        this.emit('keys_exchanged');
      }
    });
  }

  clean(): void {
    this.step = KeySteps.NONE;
    this.keysExchanged = false;
    this.otherPublicKey = '';
  }

  start(isOriginator: boolean): void {
    if (isOriginator) {
      this.clean();
    }
    this.checkStep(KeySteps.NONE);
    this.step = KeySteps.SYNACK;
    this.CommLayer.sendMessage({
      type: KeySteps.SYN,
      pubkey: this.sendPublicKey ? this.myPublicKey : undefined,
    });
  }

  checkStep(step: string): void {
    if (this.step !== step) {
      throw new Error(`Wrong Step ${this.step} ${step}`);
    }
  }

  onOtherPublicKey(pubkey: string): void {
    this.otherPublicKey = pubkey;
  }

  encryptMessage(message: string): string {
    if (!this.otherPublicKey) {
      throw new Error('Keys not exchanged');
    }
    return this.myECIES.encrypt(message, this.otherPublicKey);
  }

  decryptMessage(message: string): string {
    if (!this.otherPublicKey) {
      throw new Error('Keys not exchanged');
    }
    return this.myECIES.decrypt(message);
  }
}
