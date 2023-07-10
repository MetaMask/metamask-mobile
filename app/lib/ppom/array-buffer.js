export const base64toArrayBuffer = (b64) => {
  const buffer = window.Buffer.from(b64, 'base64');
  const uint8array = new Uint8Array(buffer);
  return uint8array.buffer;
};

export const arrayBufferToBase64 = (buffer) => {
  const uint8array = new Uint8Array(buffer);
  return window.Buffer.from(uint8array).toString('base64');
};

if (window.FileReader?.prototype.readAsArrayBuffer) {
  window.FileReader.prototype.readAsArrayBuffer = function (blob) {
    if (this.readyState === this.LOADING) throw new Error('InvalidStateError');
    this._setReadyState(this.LOADING);
    this._result = null;
    this._error = null;
    const fr = new window.FileReader();
    fr.onloadend = () => {
      const b64 = fr.result.substr(
        'data:application/octet-stream;base64,'.length,
      );
      this._result = base64toArrayBuffer(b64);
      this._setReadyState(this.DONE);
    };
    fr.readAsDataURL(blob);
  };
}
