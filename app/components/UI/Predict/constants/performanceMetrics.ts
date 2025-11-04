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

  // Data Operation Metrics (milliseconds)
  // Tracks data fetch operations
  PREDICT_GET_POSITIONS_OPERATION = 'predict.operation.get_positions',
  PREDICT_GET_ACTIVITY_OPERATION = 'predict.operation.get_activity',

  // UI Component Metrics (milliseconds)
  // Tracks individual UI component render performance
  PREDICT_ORDER_SUBMISSION_TOAST_LOADED = 'predict.ui.order_submission_toast_loaded',
  PREDICT_ORDER_CONFIRMATION_TOAST_LOADED = 'predict.ui.order_confirmation_toast_loaded',
}
