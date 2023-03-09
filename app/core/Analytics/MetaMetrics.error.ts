class MetaMetricsError extends Error {
  constructor(method: string, message: string) {
    super(`Error while executing ${method}\n\n${message}`);
    Object.setPrototypeOf(this, MetaMetricsError.prototype);
  }
}

export default MetaMetricsError;
