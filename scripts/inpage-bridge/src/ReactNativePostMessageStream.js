const { inherits } = require('util');
const { Duplex } = require('readable-stream');

const noop = () => undefined;

module.exports = PostMessageStream;

inherits(PostMessageStream, Duplex);

function PostMessageStream(opts) {
  Duplex.call(this, {
    objectMode: true,
  });

  this._name = opts.name;
  this._target = opts.target;
  this._targetWindow = opts.targetWindow || window;
  this._origin = opts.targetWindow ? '*' : location.origin;

  // initialization flags
  this._init = false;
  this._haveSyn = false;

  console.log(`[METAMASK-DEBUG] PostMessageStream created: name=${this._name}, target=${this._target}, origin=${this._origin}`);
  
  window.addEventListener('message', this._onMessage.bind(this), false);
  // send syncorization message
  console.log(`[METAMASK-DEBUG] PostMessageStream sending initial SYN [${this._name} -> ${this._target}]`);
  this._write('SYN', null, noop);
  this.cork();
}

// private
PostMessageStream.prototype._onMessage = function (event) {
  try {
    // Debug: log only the raw data payload
    const rawData = event.data;
    console.log(`[METAMASK-DEBUG] PostMessageStream._onMessage raw data [${this._name} <- ${this._target}]:`, 
      typeof rawData === 'object' ? JSON.stringify(rawData) : rawData);
    
    // Parse event data if it's a JSON string
    let msg = event.data;
    if (typeof msg === 'string') {
      try {
        msg = JSON.parse(msg);
        console.log(`[METAMASK-DEBUG] PostMessageStream parsed JSON string message`);
      } catch (err) {
        console.warn(`[METAMASK-DEBUG] PostMessageStream failed to parse string message:`, err);
        return;
      }
    }

    // Skip origin validation when using wildcard origin
    if (this._origin !== '*' && event.origin !== this._origin) {
      console.warn(`[METAMASK-DEBUG] PostMessageStream origin mismatch: expected=${this._origin}, got=${event.origin}`);
      return;
    }
    
    if (event.source !== this._targetWindow && window === top) {
      console.warn(`[METAMASK-DEBUG] PostMessageStream source mismatch`);
      return;
    }
    
    if (!msg || typeof msg !== 'object') {
      console.warn(`[METAMASK-DEBUG] PostMessageStream invalid message format:`, msg);
      return;
    }
    
    // ignore messages not addressed to this stream
    if (msg.target !== this._name) {
      console.log(`[METAMASK-DEBUG] PostMessageStream message target mismatch: expected=${this._name}, got=${msg.target}`);
      return;
    }
    
    if (!msg.data) {
      console.warn(`[METAMASK-DEBUG] PostMessageStream message has no data`);
      return;
    }
    
    // Special debugging for JSON-RPC responses
    if (msg.data && typeof msg.data === 'object' && 
        msg.data.data && typeof msg.data.data === 'object' &&
        (msg.data.data.result !== undefined || msg.data.data.error !== undefined)) {
      console.log(`[METAMASK-DEBUG] PostMessageStream received RPC response:`, 
        JSON.stringify({ id: msg.data.data.id, hasResult: !!msg.data.data.result, hasError: !!msg.data.data.error }));
    }
    
    // Debug: log parsed message
    console.log(`[METAMASK-DEBUG] PostMessageStream._onMessage processed [${this._name} <- ${this._target}]:`, 
      typeof msg.data === 'object' ? JSON.stringify(msg.data) : msg.data);

    // Mark as connected once we receive any valid message
    if (!this._connected) {
      this._connected = true;
      clearTimeout(this._connectionTimeout);
    }

    if (this._init) {
      // forward message
      try {
        console.log(`[METAMASK-DEBUG] PostMessageStream pushing message to stream [${this._name}]`);
        this.push(msg.data);
      } catch (err) {
        console.error(`[METAMASK-DEBUG] PostMessageStream error pushing to stream:`, err);
        this.emit('error', err);
      }
    } else if (msg.data === 'SYN') {
      console.log(`[METAMASK-DEBUG] PostMessageStream received SYN, sending ACK [${this._name} -> ${this._target}]`);
      this._haveSyn = true;
      
      // Send ACK directly with correct target
      const message = {
        target: this._target,
        data: 'ACK',
      };
      try {
        this._targetWindow.postMessage(message, this._origin);
      } catch (error) {
        console.error(`[METAMASK-DEBUG] Error sending ACK:`, error);
      }
      
    } else if (msg.data === 'ACK') {
      console.log(`[METAMASK-DEBUG] PostMessageStream received ACK, init=${this._init}, haveSyn=${this._haveSyn} [${this._name} <- ${this._target}]`);
      this._init = true;
      if (!this._haveSyn) {
        console.log(`[METAMASK-DEBUG] PostMessageStream sending ACK [${this._name} -> ${this._target}]`);
        
        // Send ACK directly with correct target
        const message = {
          target: this._target,
          data: 'ACK',
        };
        try {
          this._targetWindow.postMessage(message, this._origin);
        } catch (error) {
          console.error(`[METAMASK-DEBUG] Error sending ACK:`, error);
        }
      }
      console.log(`[METAMASK-DEBUG] PostMessageStream uncorking [${this._name}]`);
      this.uncork();
      
      // Clear any reconnection attempts
      if (this._synInterval) {
        clearInterval(this._synInterval);
        this._synInterval = null;
      }
    }
  } catch (err) {
    console.error(`[METAMASK-DEBUG] PostMessageStream general error in _onMessage:`, err);
  }
};

// stream plumbing
PostMessageStream.prototype._read = noop;

PostMessageStream.prototype._write = function (data, _encoding, cb) {
  try {
    // Debug: log outgoing data
    console.log(`[METAMASK-DEBUG] PostMessageStream._write [${this._name} -> ${this._target}]:`, 
      typeof data === 'object' ? JSON.stringify(data) : data);
    
    const message = {
      target: this._target,
      data,
    };
    
    this._targetWindow.postMessage(message, this._origin);
    console.log(`[METAMASK-DEBUG] PostMessageStream message posted successfully [${this._name} -> ${this._target}]`);
    cb();
  } catch (error) {
    console.error(`[METAMASK-DEBUG] PostMessageStream error posting message:`, error);
    cb(error);
  }
};
