/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Predict feature
 * Used for direct setMeasurement() calls in controllers and services
 *
 * Naming Convention: predict.{category}.{metric_name}
 * - Uses dot notation for hierarchical grouping in Sentry
 * - Categories: api, operation, screen, ui
 * - Enables easy filtering (e.g., predict.api.*) and dashboard aggregation
 */
export enum PredictMeasurementName {
  // ===== ACTIVE SENTRY METRICS =====

  // API Call Metrics (milliseconds)
  // Tracks order submission and external API performance
  PREDICT_ORDER_SUBMISSION = 'predict.api.order_submission',
}
