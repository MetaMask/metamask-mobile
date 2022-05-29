import { EventEmitter2 } from 'eventemitter2';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import KeyExchange from './KeyExchange';

export default class Socket extends EventEmitter2 {
  socket = null;

  clientsConnected = false;

  clientsReady = false;

  isOriginator;

  channelId = null;

  keyExchange: KeyExchange;

  constructor({ otherPublicKey }) {
    super();

    this.socket = io('https://lizard-positive-office.glitch.me', {});

    this.keyExchange = new KeyExchange({
      commLayer: this,
      otherPublicKey,
      sendPublicKey: false,
    });

    this.keyExchange.on('keys_exchanged', () => {
      this.emit('clients_ready', {
        isOriginator: this.isOriginator,
      });
    });
  }

  receiveMessages(channelId) {
    this.socket.on(`clients_connected-${channelId}`, (id) => {
      this.channelId = id;
      this.clientsConnected = true;
      if (this.isOriginator) {
        this.keyExchange.start('socket');
      }
    });

    this.socket.on(`channel_created-${channelId}`, (id) => {
      this.emit('channel_created', id);
    });

    this.socket.on(`clients_disconnected-${channelId}`, () => {
      //console.log('error----------------', error); //ping timeout || transport error || transport close
      return;
      this.clientsConnected = false;
      this.emit('clients_disconnected');
    });

    this.socket.on(`message-${channelId}`, ({ id, message, error }) => {
      if (error) {
        throw new Error(error);
      }

      this.checkSameId(id);

      if (!this.keyExchange.keysExchanged) {
        const messageReceived = message;
        if (messageReceived?.type.startsWith('key_handshake')) {
          return this.emit('key_exchange', { message: messageReceived });
        }
        throw new Error('Keys not exchanged');
      }

      const decryptedMessage = this.keyExchange.decryptMessage(message);
      const messageReceived = JSON.parse(decryptedMessage);
      return this.emit('message', { message: messageReceived });
    });

    this.socket.on(
      `clients_waiting_to_join-${channelId}`,
      (numberUsers: number) => {
        this.emit('clients_waiting_to_join', numberUsers);
      },
    );
  }

  checkSameId(id) {
    if (id !== this.channelId) {
      throw new Error('Wrong id');
    }
  }

  send(type, message) {
    this.socket.emit(type, message);
  }

  sendMessage(message) {
    if (!this.channelId) {
      throw new Error('Create a channel first');
    }
    if (!this.keyExchange.keysExchanged) {
      if (message?.type.startsWith('key_handshake')) {
        return this.socket.emit('message', { id: this.channelId, message });
      }
      throw new Error('Keys not exchanged');
    }

    const encryptedMessage = this.keyExchange.encryptMessage(
      JSON.stringify(message),
    );

    return this.socket.emit('message', {
      id: this.channelId,
      message: encryptedMessage,
    });
  }

  connectToChannel(id) {
    this.channelId = id;
    this.receiveMessages(this.channelId);
    this.socket.emit('join_channel', id);
  }

  createChannel() {
    this.isOriginator = true;
    const channelId = uuidv4();
    this.receiveMessages(channelId);
    this.socket.emit('join_channel', channelId);
    return { channelId, pubKey: this.keyExchange.myPublicKey };
  }

  disconnect() {
    if (this.keyExchange.keysExchanged) this.sendMessage({ type: 'pause' });
    this.socket.disconnect();
    this.removeAllListeners();
  }
}
