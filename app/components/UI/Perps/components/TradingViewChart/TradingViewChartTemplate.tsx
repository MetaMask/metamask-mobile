import { Theme } from '../../../../../util/theme/models';

export const createTradingViewChartTemplate = (
  theme: Theme,
  lightweightChartsLib: string,
  coloredVolume = true,
): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TradingView Chart</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            background: ${theme.colors.background.default};
            /* Touch optimization */
            touch-action: pan-x;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            overflow: hidden;
        }
        #container {
            width: 100%;
            height: 100%;
            position: relative;
            background: ${theme.colors.background.default};
            /* Touch optimization for chart container */
            touch-action: pan-x;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <div id="container"></div>
    <!-- Load Lightweight Charts Library (Local) -->
    <script>
        ${lightweightChartsLib}
    </script>
    <script>
        // Global variables
        window.chart = null;
        window.candlestickSeries = null;
        window.volumeSeries = null; // Volume histogram series
        window.isInitialDataLoad = true; // Track if this is the first data load
        window.lastDataKey = null; // Track the last dataset to avoid unnecessary autoscaling
        window.visibleCandleCount = 30; // Default visible candle count (matches PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT)
        window.allCandleData = []; // Store all loaded data for zoom functionality
        window.visiblePriceRange = null; // Track visible price range for dynamic decimal precision
        window.currentInterval = null; // Track current interval for zoom reset on change

        // Helper function to get date string in user's timezone (YYYY-MM-DD)
        window.getDateString = function(date, userTimezone) {
            const year = date.toLocaleString('en-US', { year: 'numeric', timeZone: userTimezone });
            const month = date.toLocaleString('en-US', { month: '2-digit', timeZone: userTimezone });
            const day = date.toLocaleString('en-US', { day: '2-digit', timeZone: userTimezone });
            return year + '-' + month + '-' + day;
        };
        
        // Helper function to check if a date is today in user's timezone
        window.isToday = function(date, userTimezone) {
            const now = new Date();
            const todayString = window.getDateString(now, userTimezone);
            const dateString = window.getDateString(date, userTimezone);
            return todayString === dateString;
        };

        // Cache for Intl.NumberFormat instances to avoid expensive recreation
        // Key: decimal count (e.g., "0", "2", "4"), Value: NumberFormat instance
        window.formatterCache = new Map();

        // Price formatting constants (matches formatUtils.ts PRICE_RANGES_UNIVERSAL)
        window.PRICE_THRESHOLD = {
            VERY_HIGH: 100000,  // > $100k
            HIGH: 10000,        // > $10k
            LARGE: 1000,        // > $1k
            MEDIUM: 100,        // > $100
            MEDIUM_LOW: 10,     // > $10
            LOW: 0.01,          // >= $0.01
        };

        // Universal price ranges configuration (matches PRICE_RANGES_UNIVERSAL from formatUtils.ts)
        window.PRICE_RANGES = [
            { threshold: window.PRICE_THRESHOLD.VERY_HIGH, minDec: 0, maxDec: 0, sigDig: 6 },
            { threshold: window.PRICE_THRESHOLD.HIGH, minDec: 0, maxDec: 0, sigDig: 5 },
            { threshold: window.PRICE_THRESHOLD.LARGE, minDec: 0, maxDec: 1, sigDig: 5 },
            { threshold: window.PRICE_THRESHOLD.MEDIUM, minDec: 0, maxDec: 2, sigDig: 5 },
            { threshold: window.PRICE_THRESHOLD.MEDIUM_LOW, minDec: 0, maxDec: 4, sigDig: 5 },
            { threshold: window.PRICE_THRESHOLD.LOW, minDec: 2, maxDec: 6, sigDig: 5 },
            { threshold: 0, minDec: 2, maxDec: 6, sigDig: 4 }, // < $0.01
        ];

        // Get or create cached Intl.NumberFormat for given decimal precision
        // Caching prevents expensive formatter recreation on every Y-axis label render
        window.getCachedFormatter = function(decimals) {
            const key = String(decimals);

            if (!window.formatterCache.has(key)) {
                window.formatterCache.set(key, new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }));
            }

            return window.formatterCache.get(key);
        };

        // Format price with significant digits (matches formatUtils.ts logic)
        window.formatPriceWithSignificantDigits = function(value, sigDigits, minDec, maxDec) {
            if (value === 0) return { value: 0, decimals: minDec || 0 };

            const absValue = Math.abs(value);

            if (absValue >= 1) {
                const integerDigits = Math.floor(Math.log10(absValue)) + 1;
                const decimalsNeeded = sigDigits - integerDigits;
                let targetDecimals = Math.max(decimalsNeeded, 0);

                if (minDec !== undefined && targetDecimals < minDec) {
                    targetDecimals = minDec;
                }

                const finalDecimals = maxDec !== undefined ? Math.min(targetDecimals, maxDec) : targetDecimals;
                const roundedValue = Number(value.toFixed(finalDecimals));

                return { value: roundedValue, decimals: finalDecimals };
            }

            // For values < 1, use toPrecision
            const precisionStr = absValue.toPrecision(sigDigits);
            const precisionNum = parseFloat(precisionStr);
            const valueStr = precisionNum.toString();
            const [, decPart = ''] = valueStr.split('.');
            let actualDecimals = decPart.length;

            if (minDec !== undefined && actualDecimals < minDec) {
                actualDecimals = minDec;
            }
            if (maxDec !== undefined && actualDecimals > maxDec) {
                actualDecimals = maxDec;
            }

            const finalValue = value < 0 ? -precisionNum : precisionNum;
            const roundedValue = Number(finalValue.toFixed(actualDecimals));

            return { value: roundedValue, decimals: actualDecimals };
        };

        // Format price using universal ranges (matches formatPerpsFiat from formatUtils.ts)
        window.formatPriceUniversal = function(price) {
            if (price === 0) return '0';
            if (isNaN(price)) return '0';

            const absPrice = Math.abs(price);

            // Find matching range
            let rangeConfig = null;
            for (let i = 0; i < window.PRICE_RANGES.length; i++) {
                if (absPrice > window.PRICE_RANGES[i].threshold) {
                    rangeConfig = window.PRICE_RANGES[i];
                    break;
                }
            }

            // Fallback to last range if nothing matched
            if (!rangeConfig) {
                rangeConfig = window.PRICE_RANGES[window.PRICE_RANGES.length - 1];
            }

            // Calculate formatting with significant digits
            const { value: formattedValue, decimals } = window.formatPriceWithSignificantDigits(
                price,
                rangeConfig.sigDig,
                rangeConfig.minDec,
                rangeConfig.maxDec
            );

            // Format the number with consistent decimal places using cached formatter
            // Keep trailing zeros to maintain visual consistency on Y-axis
            // e.g., for $1.24-$1.26 range, all values show 4 decimals: 1.2391, 1.2560, 1.2500
            const formatter = window.getCachedFormatter(decimals);
            return formatter.format(formattedValue);
        };
        
        // Smart timestamp formatter using TradingView's native tickMarkType with fallback
        window.formatTimestamp = function(time, tickMarkType, isCrosshair = false) {
            const date = new Date(time * 1000);
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            if (isCrosshair) {
                // Crosshair labels: always show full date and time for precision
                return date.toLocaleString('en-US', { 
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false,
                    timeZone: userTimezone
                });
            } else {
                // Use TradingView's native tickMarkType if available
                if (tickMarkType) {
                    switch (tickMarkType) {
                        case 'Year':
                            return date.getFullYear().toString();
                        case 'Month':
                            return date.toLocaleString('en-US', { 
                                month: 'short',
                                timeZone: userTimezone
                            });
                        case 'DayOfMonth':
                            // Always show day + month for DayOfMonth tick type (e.g., 1D candles)
                            // Format: "17 Nov" (day before month)
                            const day = date.toLocaleString('en-US', { 
                                day: 'numeric',
                                timeZone: userTimezone
                            });
                            const month = date.toLocaleString('en-US', { 
                                month: 'short',
                                timeZone: userTimezone
                            });
                            return day + ' ' + month;
                        case 'Hour':
                        case 'Minute':
                            // Show date + time if not today, otherwise just time
                            if (!window.isToday(date, userTimezone)) {
                                // Format: "17 Nov 00:15"
                                const day = date.toLocaleString('en-US', { 
                                    day: 'numeric',
                                    timeZone: userTimezone
                                });
                                const month = date.toLocaleString('en-US', { 
                                    month: 'short',
                                    timeZone: userTimezone
                                });
                                const timeStr = date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                                return day + ' ' + month + ' ' + timeStr;
                            } else {
                                // Show time only for today
                                return date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                            }
                        case 'Second':
                            return date.toLocaleString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false,
                                timeZone: userTimezone
                            });
                    }
                }
                
                // Fallback: Use our own logic based on visible range
                if (window.chart && window.allCandleData && window.allCandleData.length > 0) {
                    const visibleRange = window.chart.timeScale().getVisibleRange();
                    if (visibleRange) {
                        const startDate = new Date(visibleRange.from * 1000);
                        const endDate = new Date(visibleRange.to * 1000);
                        
                        // Calculate the time span in hours
                        const timeSpanHours = (visibleRange.to - visibleRange.from) / 3600;

                        if (timeSpanHours <= 24) {
                            // Less than 24 hours: show date + time if not today, otherwise just time
                            if (!window.isToday(date, userTimezone)) {
                                // Format: "17 Nov 00:15"
                                const day = date.toLocaleString('en-US', { 
                                    day: 'numeric',
                                    timeZone: userTimezone
                                });
                                const month = date.toLocaleString('en-US', { 
                                    month: 'short',
                                    timeZone: userTimezone
                                });
                                const timeStr = date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                                return day + ' ' + month + ' ' + timeStr;
                            } else {
                                // Show time only for today
                                return date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                            }
                        } else if (timeSpanHours <= 24 * 7) {
                           // Less than a week: show date + time if not today, otherwise just time
                            if (!window.isToday(date, userTimezone)) {
                                // Format: "17 Nov 00:15"
                                const day = date.toLocaleString('en-US', { 
                                    day: 'numeric',
                                    timeZone: userTimezone
                                });
                                const month = date.toLocaleString('en-US', { 
                                    month: 'short',
                                    timeZone: userTimezone
                                });
                                const timeStr = date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                                return day + ' ' + month + ' ' + timeStr;
                            } else {
                                // Show time only for today
                                return date.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false,
                                    timeZone: userTimezone
                                });
                            }
                        } else {
                             // Longer ranges: always show day + month (e.g., "17 Nov")
                            // This is especially important for 1D candles
                            const day = date.toLocaleString('en-US', { 
                                day: 'numeric',
                                timeZone: userTimezone
                            });
                            const month = date.toLocaleString('en-US', { 
                                month: 'short',
                                timeZone: userTimezone
                            });
                            return day + ' ' + month;
                        }
                    }
                }
                
                // Final fallback: show date and time
                // Format: "17 Nov 00:15"
                const day = date.toLocaleString('en-US', { 
                    day: 'numeric',
                    timeZone: userTimezone
                });
                const month = date.toLocaleString('en-US', { 
                    month: 'short',
                    timeZone: userTimezone
                });
                const timeStr = date.toLocaleString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false,
                    timeZone: userTimezone
                });

                return day + ' ' + month + ' ' + timeStr;
            }
        };
        
        // Zoom limits - consistent with chart configuration
        window.ZOOM_LIMITS = {
            MIN_CANDLES: 10,  // Minimum candles visible when zoomed in
            MAX_CANDLES: 250, // Maximum candles visible when zoomed out
            DEFAULT_CANDLES: 30 // Default visible candles (matches PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT)
        };
        
        // Performance optimization variables
        window.lastRangeChangeTime = 0;
        window.isUserPanning = false;
        window.panStartTime = 0;
        window.panEndTimeout = null;
        window.lastLogicalRange = null;
        window.panVelocity = 0;
        window.panningDisableTime = 300; // ms to disable zoom restrictions after panning stops

        // Reset prevention variables
        window.hasUserInteracted = false; // Track if user has ever interacted with the chart
        window.lastDataLength = 0; // Track actual data changes vs rerenders

        // Edge detection variables for historical data loading
        window.lastHistoryFetchTime = 0;
        window.HISTORY_FETCH_COOLDOWN = 2000; // 2 seconds cooldown between fetches
        window.EDGE_THRESHOLD = 5; // Consider "at edge" if within 5 candles from start
        // Set up edge detection for loading more historical data
        window.setupEdgeDetection = function() {
            if (!window.chart) {
                return;
            }

            try {
                // Subscribe to visible logical range changes
                window.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                    if (!range || !window.allCandleData || window.allCandleData.length === 0) {
                        return;
                    }

                    // Check if we're near the left edge (oldest data)
                    const isAtLeftEdge = range.from <= window.EDGE_THRESHOLD;

                    if (isAtLeftEdge) {
                        const now = Date.now();
                        const timeSinceLastFetch = now - window.lastHistoryFetchTime;

                        // Throttle to avoid spam requests
                        if (timeSinceLastFetch < window.HISTORY_FETCH_COOLDOWN) {
                            return;
                        }

                        // Update last fetch time
                        window.lastHistoryFetchTime = now;

                        // Send message to React Native to fetch more historical data
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'NEED_MORE_HISTORY',
                                timestamp: new Date().toISOString(),
                                currentDataLength: window.allCandleData.length,
                                visibleRange: { from: range.from, to: range.to }
                            }));
                        }
                    }
                });
            } catch (error) {
                console.error('📊 TradingView: Error setting up edge detection:', error);
            }
        };

        // Step 2: Create chart
        function createChart() {
            if (!window.LightweightCharts) {
                console.error('TradingView: Library not available');
                return;
            }
            try {
                // Create chart with theme applied via template literals
                const container = document.getElementById('container');
                window.chart = LightweightCharts.createChart(container, {
                    width: container.clientWidth,
                    height: container.clientHeight,
                    layout: {
                        background: {
                            color: 'transparent'
                        },
                        textColor: '${theme.colors.text.muted}',
                        attributionLogo: false, // Hide the TradingView logo
                        // Performance optimizations
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    },
                    // Optimized for smooth panning on mobile devices
                    autoSize: true, // Enable auto-resize to match container dimensions
                    handleScroll: true,
                    handleScale: true,
                    // Enhanced kinetic scrolling with momentum tuning for mobile
                    // Fine-tuing options: increate friction for more momentum, increase min velocity for more sensitivity
                    kinetic: {
                        mouse: true,
                        touch: true,
                        // Momentum and friction tuning for smoother panning
                        momentum: {
                            friction: 0.2, // Very low friction for quick stop after fling
                            minVelocity: 0.3, // Lower threshold for more responsive stopping
                        },
                        // Additional kinetic settings for mobile optimization
                        touch: {
                            enabled: true,
                            // Fine-tune touch sensitivity
                            sensitivity: 0.5, // Default sensitivity
                        }
                    },
                    crosshair: {
                        mode: 3, // Normal mode - crosshair appears on touch/hover
                        vertLine: {
                            visible: true,
                            labelVisible: true,
                            width: 1,
                            style: 3, // Dotted line
                            color: '${theme.colors.text.muted}',
                        },
                        horzLine: {
                            visible: false, // Hide horizontal line
                            labelVisible: false,
                        },
                    },
                    localization: {
                        priceFormatter: (price) => {
                            // Hybrid formatter: starts with universal formatting but adjusts for tight ranges
                            // This prevents duplicate Y-axis labels when zoomed in while maintaining
                            // consistency with header and pills at normal zoom levels

                            if (price === 0) return '0';
                            if (isNaN(price)) return '0';

                            const absPrice = Math.abs(price);

                            // Get base formatting configuration from universal ranges
                            let rangeConfig = null;
                            for (let i = 0; i < window.PRICE_RANGES.length; i++) {
                                if (absPrice > window.PRICE_RANGES[i].threshold) {
                                    rangeConfig = window.PRICE_RANGES[i];
                                    break;
                                }
                            }
                            if (!rangeConfig) {
                                rangeConfig = window.PRICE_RANGES[window.PRICE_RANGES.length - 1];
                            }

                            // Calculate base formatting with significant digits
                            const { value: formattedValue, decimals: baseDecimals } = window.formatPriceWithSignificantDigits(
                                price,
                                rangeConfig.sigDig,
                                rangeConfig.minDec,
                                rangeConfig.maxDec
                            );

                            // Determine if we need extra decimals based on visible range
                            let finalDecimals = baseDecimals;

                            if (window.visiblePriceRange && window.visiblePriceRange.span > 0) {
                                const span = window.visiblePriceRange.span;

                                // Dynamic decimal adjustment based on zoom level
                                // Tighter visible range = more decimals needed to distinguish Y-axis labels
                                if (span < 1) {
                                    finalDecimals = Math.max(4, baseDecimals);
                                } else if (span < 10) {
                                    finalDecimals = Math.max(3, baseDecimals);
                                } else if (span < 100) {
                                    finalDecimals = Math.max(2, baseDecimals);
                                }
                                // For span >= 100, use baseDecimals (no adjustment needed)
                            }

                            // Format with final decimal precision using cached formatter
                            const formatter = window.getCachedFormatter(finalDecimals);
                            return formatter.format(formattedValue);
                        },
                        timeFormatter: (time) => {
                            // Format time in user's local timezone for crosshair labels
                            return window.formatTimestamp(time, null, true);
                        }
                    },
                    grid: {
                        vertLines: { color: '${theme.colors.border.muted}' },
                        horzLines: { color: '${theme.colors.border.muted}' },
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        borderColor: 'transparent',
                        rightOffset: 0, // Prevent right margin/padding
                        barSpacing: 8, // Spacing between candles
                        minBarSpacing: 1, // Minimum spacing when zoomed in
                        // Mobile-optimized scroll and zoom handling
                        handleScale: {
                            axisPressedMouseMove: {
                                time: true, // Enable time scale dragging
                                price: false, // Disable price scale dragging to prevent conflicts
                            },
                            mouseWheel: false, // Disable mouse wheel zoom (mobile app)
                            pinch: true, // Enable pinch zoom on mobile
                            pressedMouseMove: false, // Enable drag scroll for direct touch control
                            horzTouchDrag: false, // Enable horizontal touch drag
                        },
                        handleScroll: {
                            mouseWheel: false, // Disable mouse wheel scroll (mobile app)
                            pressedMouseMove: true, // Enable drag scroll for direct touch control
                            horzTouchDrag: true, // Enable horizontal touch drag
                            vertTouchDrag: false, // Disable vertical touch drag
                            // Optimize for direct press-and-drag responsiveness
                            kineticScroll: true, // Keep kinetic scroll for fling gestures
                            momentum: true, // Keep momentum for natural feel
                            rubberBand: false, // Disable rubber band effect to reduce conflicts
                        },
                        // Simplified panning configuration
                        shiftVisibleRangeOnNewBar: false, // Prevent automatic shifting
                        allowShiftVisibleRangeOnWhitespaceReplacement: false, // Prevent unexpected jumps
                        fixLeftEdge: false, // Allow free scrolling
                        fixRightEdge: false, // Allow free scrolling  
                        lockVisibleTimeRangeOnResize: false, // Don't lock on resize
                        rightBarStaysOnScroll: false, // Don't auto-follow latest data during scroll
                        uniformDistribution: false, // Allow natural time distribution
                        // Format time with smart conditional formatting using TradingView's native tickMarkType
                        tickMarkFormatter: (time, tickMarkType) => {
                            return window.formatTimestamp(time, tickMarkType, false);
                        },
                    },
                    rightPriceScale: {
                        borderColor: 'transparent',
                        visible: true,
                        autoScale: true,
                        alignLabels: true,
                        textColor: '${theme.colors.text.muted}',
                        // Allow labels even when they don't perfectly fit
                        entireTextOnly: false,
                        // Use normal linear mode for precise control
                        mode: 0, // PriceScaleMode.Normal
                        invertScale: false,
                        ticksVisible: true,
                        // Ensure edge tick marks are visible for granular display
                        ensureEdgeTickMarksVisible: true,
                        // With multiple panes, scale automatically appears only in its pane
                        // No scaleMargins needed - pane heights control layout
                    },
                    leftPriceScale: {
                        borderColor: 'transparent',
                        visible: false, // Hide left scale - volume uses overlay with no labels
                        autoScale: true,
                        mode: 0,
                    }
                });

                // Configure pane separator styling for visual separation between candlesticks and volume
                try {
                    window.chart.applyOptions({
                        layout: {
                            background: {
                                color: '${theme.colors.background.default}',
                            },
                            textColor: '${theme.colors.text.muted}',
                            // Pane separator configuration (appears between panes)
                            panes: {
                                separatorColor: 'transparent', // Hide separator line between panes
                                separatorHoverColor: 'transparent', // Hide hover color
                                enableResize: false, // Prevent user from dragging separator
                            },
                        },
                    });
                } catch (error) {
                    // Pane configuration is optional, errors are not critical
                }

                // Initialize volume visibility state (default: visible)
                window.volumeVisible = true;

                // Initialize colored volume state (from template parameter)
                window.coloredVolume = ${coloredVolume};

                // Notify React Native that chart is ready
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CHART_READY',
                        timestamp: new Date().toISOString()
                    }));
                }

                // Set up edge detection for loading more historical data
                window.setupEdgeDetection();
            } catch (error) {
                console.error('TradingView: Error creating chart:', error);
            }
        }
        // Create candlestick series when data is received
        window.createCandlestickSeries = function() {
            if (!window.chart || !window.LightweightCharts?.CandlestickSeries) return null;
            // Remove existing series if it exists
            if (window.candlestickSeries) {
                window.chart.removeSeries(window.candlestickSeries);
            }
            // Create new candlestick series in pane 0 (top pane)
            window.candlestickSeries = window.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: '${theme.colors.success.default}',
                downColor: '${theme.colors.error.default}',
                borderVisible: false,
                wickUpColor: '${theme.colors.success.default}',
                wickDownColor: '${theme.colors.error.default}',
                priceLineColor: '${theme.colors.icon.alternative}',
                priceLineWidth: 1,
                priceScaleId: 'right', // Explicitly use right price scale
                lastValueVisible: false,
                // Use native PriceLineSource for better price line handling
                priceLineSource: window.LightweightCharts.PriceLineSource.LastBar,
                // Configure price format with smart precision
                priceFormat: {
                    type: 'price',
                    precision: 6, // Allow up to 6 decimal places for very small values
                    minMove: 0.000001, // Very small minimum move for precision
                },
                // Optimize for smooth panning
                crosshairMarkerVisible: false, // Disable crosshair during panning for performance
                crosshairMarkerRadius: 0, // Minimize crosshair impact
            }, 0); // Pane index 0 (default/top pane for candlesticks)

            // Apply minimal scale margins to the candlestick price scale
            // Note: Volume is in a separate pane, so no bottom margin needed
            window.candlestickSeries.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.05,    // 5% padding at top
                    bottom: 0.05, // Minimal bottom padding - pane heights control layout
                },
            });

            // Subscribe to crosshair events to send OHLC data to React Native
            window.chart.subscribeCrosshairMove((param) => {
                if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > container.clientWidth || param.point.y < 0 || param.point.y > container.clientHeight) {
                    // Crosshair is outside the chart area - hide legend
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'OHLC_DATA',
                            data: null,
                            timestamp: new Date().toISOString()
                        }));
                    }
                    return;
                }

                // Get OHLC data from the candlestick series
                if (window.candlestickSeries && param.seriesData && param.seriesData.get(window.candlestickSeries)) {
                    const data = param.seriesData.get(window.candlestickSeries);
                    if (data && data.open !== undefined) {
                        // Get volume data from the volume series if available
                        let volumeValue = null;
                        if (window.volumeSeries && param.seriesData.get(window.volumeSeries)) {
                            const volumeData = param.seriesData.get(window.volumeSeries);
                            if (volumeData && volumeData.value !== undefined) {
                                volumeValue = volumeData.value.toString();
                            }
                        }

                        // Send raw numeric values as strings - formatting will be done on React Native side
                        const ohlcData = {
                            open: data.open.toString(),
                            high: data.high.toString(),
                            low: data.low.toString(),
                            close: data.close.toString(),
                            volume: volumeValue,
                            time: param.time
                        };

                        // Send OHLC data back to React Native
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'OHLC_DATA',
                                data: ohlcData,
                                timestamp: new Date().toISOString()
                            }));
                        }
                    } else {
                        // No valid OHLC data - hide legend
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'OHLC_DATA',
                                data: null,
                                timestamp: new Date().toISOString()
                            }));
                        }
                    }
                } else {
                    // No series data - hide legend
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'OHLC_DATA',
                            data: null,
                            timestamp: new Date().toISOString()
                        }));
                    }
                }
            });
            
            return window.candlestickSeries;
        };

        // Empty formatter to hide volume Y-axis labels
        window.formatVolumeEmpty = function(value) {
            return ''; // Always return empty string to hide labels
        };

        // Function to create volume histogram series
        window.createVolumeSeries = function() {
            if (!window.chart) {
                return null;
            }

            // Remove existing volume series if it exists
            if (window.volumeSeries) {
                try {
                    window.chart.removeSeries(window.volumeSeries);
                } catch (e) {
                    // Silent error handling
                }
            }

            // Create volume histogram series
            try {
                // Use the old API: chart.addSeries(SeriesType, options, paneIndex)
                // Pane index 1 creates a NEW separate pane below the default pane 0
                window.volumeSeries = window.chart.addSeries(window.LightweightCharts.HistogramSeries, {
                    color: '${theme.colors.success.default}',
                    priceFormat: {
                        type: 'custom',
                        formatter: window.formatVolumeEmpty, // Use empty formatter to hide Y-axis labels
                        minMove: 0.01,
                    },
                    priceScaleId: '', // Use empty string for separate/independent price scale
                    lastValueVisible: false,
                    priceLineVisible: false,
                    base: 0, // Start histogram from zero
                }, 1); // Pane index 1 - creates NEW bottom pane for volume

                // Configure volume price scale options (completely hidden)
                window.volumeSeries.priceScale().applyOptions({
                    autoScale: true,
                    mode: 0, // Normal mode for proper scaling
                    visible: false, // Hide the price scale completely for volume
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.2, // Add 20% margin at bottom to prevent 0 from showing
                    },
                });

                // Configure pane heights: 80% for candlesticks (pane 0), 20% for volume (pane 1)
                // Call the helper function to set dynamic heights after both panes exist
                try {
                    // Set pane heights after a brief delay to ensure panes are fully created
                    setTimeout(() => {
                        if (window.setPaneHeights) {
                            window.setPaneHeights();
                        }
                    }, 100);
                } catch (e) {
                    // Pane height configuration is optional
                }

                return window.volumeSeries;
            } catch (error) {
                return null;
            }
        };

        // Helper function to set pane heights with 80/20 split (candlesticks/volume)
        window.setPaneHeights = function() {
            if (!window.chart) {
                return;
            }

            try {
                const panes = window.chart.panes();

                if (panes.length < 2) {
                    return;
                }

                // Use actual container height for accurate measurement during orientation changes
                // This fixes race conditions where window.chart.options().height may be stale
                const container = document.getElementById('container');
                const totalHeight = container ? container.clientHeight : (window.chart.options().height || window.innerHeight);

                // Calculate heights with 80/20 split
                // Note: TradingView has a minimum pane height of ~30px
                const mainPaneHeight = Math.floor(totalHeight * 0.80); // 80% for candlesticks
                const volumePaneHeight = Math.max(Math.floor(totalHeight * 0.20), 30); // 20% for volume (min 30px)

                // Set pane heights
                panes[0].setHeight(mainPaneHeight);  // Candlestick pane
                panes[1].setHeight(volumePaneHeight); // Volume pane
            } catch (error) {
                // Silent error handling
            }
        };

        // Function to update visible price range for dynamic formatting
        window.updateVisiblePriceRange = function() {
            if (!window.allCandleData || window.allCandleData.length === 0) {
                return;
            }
            
            try {
                // Get visible range from time scale
                const timeScale = window.chart.timeScale();
                const visibleLogicalRange = timeScale.getVisibleLogicalRange();
                
                if (!visibleLogicalRange) {
                    // Fallback: use all data
                    let minPrice = Infinity;
                    let maxPrice = -Infinity;
                    
                    window.allCandleData.forEach(candle => {
                        if (candle && candle.low !== undefined && candle.high !== undefined) {
                            minPrice = Math.min(minPrice, candle.low);
                            maxPrice = Math.max(maxPrice, candle.high);
                        }
                    });
                    
                    if (minPrice !== Infinity && maxPrice !== -Infinity) {
                        window.visiblePriceRange = {
                            min: minPrice,
                            max: maxPrice,
                            span: maxPrice - minPrice
                        };
                    }
                    return;
                }
                
                // Calculate visible data indices
                const firstVisibleIndex = Math.max(0, Math.ceil(visibleLogicalRange.from));
                const lastVisibleIndex = Math.min(window.allCandleData.length - 1, Math.floor(visibleLogicalRange.to));
                
                if (firstVisibleIndex <= lastVisibleIndex) {
                    let minPrice = Infinity;
                    let maxPrice = -Infinity;
                    
                    for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
                        const candle = window.allCandleData[i];
                        if (candle && candle.low !== undefined && candle.high !== undefined) {
                            minPrice = Math.min(minPrice, candle.low);
                            maxPrice = Math.max(maxPrice, candle.high);
                        }
                    }
                    
                    if (minPrice !== Infinity && maxPrice !== -Infinity) {
                        window.visiblePriceRange = {
                            min: minPrice,
                            max: maxPrice,
                            span: maxPrice - minPrice
                        };
                    }
                }
            } catch (error) {
                console.error('Error updating visible price range:', error);
            }
        };
        
        // Function to create/update current price line
        window.updateCurrentPriceLine = function(currentPrice) {
            if (!window.candlestickSeries) {
                return;
            }

            // Remove existing current price line if it exists
            if (window.priceLines.currentPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.currentPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.currentPrice = null;
            }

            // Create new current price line if price is valid
            if (currentPrice && !isNaN(parseFloat(currentPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(currentPrice),
                        color: '${theme.colors.background.muted}',
                        lineWidth: 2,
                        lineStyle: 2, // Dashed line
                        axisLabelVisible: true,
                        title: '',
                        // Use universal formatting to match header precision
                        // This prevents mismatch where Y-axis shows zoom-adjusted decimals
                        // but price line label should always match the header display
                        axisLabelFormatter: (price) => window.formatPriceUniversal(price)
                    });
                    // Store reference for future removal
                    window.priceLines.currentPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
        };

        // Optimized resize handler with throttling
        let resizeTimeout;
        let finalResizeTimeout; // Debounced final call to ensure pane heights are correct after all resize events
        window.addEventListener('resize', function() {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            if (finalResizeTimeout) clearTimeout(finalResizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.chart) {
                    // With autoSize: true, chart automatically resizes to container
                    // No need to manually set width/height

                    // Conditionally recalculate pane heights based on pane count
                    const panes = window.chart.panes();

                    if (panes.length === 2 && window.volumeSeries) {
                        // Force volume series to recalculate scale by refreshing data
                        try {
                            if (window.allCandleData && window.allCandleData.length > 0) {
                                const volumeData = window.allCandleData.map(candle => ({
                                    time: candle.time,
                                    value: (parseFloat(candle.volume) * parseFloat(candle.close)) || 0,
                                    color: window.coloredVolume
                                        ? (candle.close >= candle.open ? '${theme.colors.success.default}' : '${theme.colors.error.default}')
                                        : '${theme.colors.border.muted}'
                                }));
                                window.volumeSeries.setData(volumeData);

                                // Re-apply 80/20 split AFTER data refresh (with small delay)
                                setTimeout(function() {
                                    if (window.setPaneHeights) {
                                        window.setPaneHeights();
                                    }
                                }, 50);
                            } else {
                                // Fallback: just toggle autoscale and apply pane heights
                                window.volumeSeries.priceScale().applyOptions({
                                    autoScale: true,
                                });
                                if (window.setPaneHeights) {
                                    window.setPaneHeights();
                                }
                            }
                        } catch (error) {
                            // Silent error handling
                        }
                    } else if (panes.length === 1) {
                        // Volume is hidden: Expand candlestick to 100% height
                        const chartHeight = window.chart.options().height;
                        panes[0].setHeight(chartHeight);

                        // Reset scale margins to use full pane
                        if (window.candlestickSeries) {
                            window.candlestickSeries.priceScale().applyOptions({
                                scaleMargins: {
                                    top: 0.05,
                                    bottom: 0.05,
                                },
                            });
                        }

                        // Update visible price range instead of fitContent
                        window.updateVisiblePriceRange();
                    }
                }

                // Schedule a final pane height enforcement after resize events fully settle
                // This fixes race conditions during orientation changes where multiple resize events fire
                finalResizeTimeout = setTimeout(() => {
                    if (window.chart && window.volumeSeries && window.setPaneHeights) {
                        window.setPaneHeights();
                    }
                }, 300); // Wait for resize events to fully settle
            }, 100); // Throttle resize to prevent excessive redraws
        });
        
        // Simple cleanup function
        window.cleanupChartEventListeners = function() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            if (finalResizeTimeout) {
                clearTimeout(finalResizeTimeout);
            }
        };
        // Store price lines for management
        window.priceLines = {
            entryPrice: null,
            liquidationPrice: null, 
            takeProfitPrice: null,
            stopLossPrice: null,
            currentPrice: null
        };
        
        // Store original price line data for restoration
        window.originalPriceLineData = null;
        
        // Helper functions to hide/show all price lines during panning
        window.hideAllPriceLines = function() {
            if (!window.candlestickSeries) return;

            // Store price line data for restoration (exclude currentPrice as it's managed separately)
            window.originalPriceLineData = {
                entryPrice: window.priceLines.entryPrice,
                liquidationPrice: window.priceLines.liquidationPrice,
                takeProfitPrice: window.priceLines.takeProfitPrice,
                stopLossPrice: window.priceLines.stopLossPrice
            };

            // Remove price lines (exclude currentPrice as it's managed by updateCurrentPriceLine)
            ['entryPrice', 'liquidationPrice', 'takeProfitPrice', 'stopLossPrice'].forEach(key => {
                if (window.priceLines[key]) {
                    try {
                        window.candlestickSeries.removePriceLine(window.priceLines[key]);
                        window.priceLines[key] = null;
                    } catch (error) {
                        // Silent error handling
                    }
                }
            });
        };
        
        window.showAllPriceLines = function() {
            if (!window.candlestickSeries || !window.originalPriceLineData) return;
            
            // Recreate all price lines from stored data
            if (window.originalPriceLineData.entryPrice) {
                try {
                    window.priceLines.entryPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.entryPrice.price,
                        color: '${theme.colors.text.muted}',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'Entry'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            if (window.originalPriceLineData.liquidationPrice) {
                try {
                    window.priceLines.liquidationPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.liquidationPrice.price,
                        color: '${theme.colors.error.default}',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'Liq'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            if (window.originalPriceLineData.takeProfitPrice) {
                try {
                    window.priceLines.takeProfitPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.takeProfitPrice.price,
                        color: '${theme.colors.success.default}',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'TP'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            if (window.originalPriceLineData.stopLossPrice) {
                try {
                    window.priceLines.stopLossPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.stopLossPrice.price,
                        color: '${theme.colors.background.alternative}',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }

            // Clear stored data
            // Note: currentPrice is NOT recreated here as it's managed separately by updateCurrentPriceLine
            window.originalPriceLineData = null;
        };
        // Simple zoom function without complex interaction tracking
        window.applyZoom = function(candleCount, forceReset = false) {
            if (!window.chart || !window.allCandleData || window.allCandleData.length === 0) {
                return;
            }

            // Simple zoom without interaction restrictions
            const minCandles = window.ZOOM_LIMITS.MIN_CANDLES;
            const maxCandles = window.ZOOM_LIMITS.MAX_CANDLES;
            const actualCandleCount = Math.max(minCandles, Math.min(maxCandles, candleCount));

            const dataLength = window.allCandleData.length;

            try {
                // Use setVisibleLogicalRange for consistent bar width control
                // Logical range uses bar indices: from = first visible bar, to = last visible bar
                // We want to show the last N candles, so:
                // - from = dataLength - actualCandleCount (first visible bar index)
                // - to = dataLength - 1 + small offset for right padding
                const fromIndex = Math.max(0, dataLength - actualCandleCount);
                const toIndex = dataLength - 1 + 2; // +2 for a small right margin

                window.chart.timeScale().setVisibleLogicalRange({
                    from: fromIndex,
                    to: toIndex,
                });

                // Scroll to real-time to ensure latest candles are visible at the right edge
                if (forceReset) {
                    window.chart.timeScale().scrollToRealTime();
                }
            } catch (error) {
                console.error('TradingView: Error setting visible logical range:', error);
                // Fallback to fitContent if setVisibleLogicalRange fails
                window.chart.timeScale().fitContent();
            }

            window.visibleCandleCount = actualCandleCount;

            // Update visible price range for dynamic formatting after zoom
            window.updateVisiblePriceRange();
        };

        // Update TPSL price lines
        window.updatePriceLines = function(lines) {
            if (!window.candlestickSeries) {
                return;
            }

            // Update current price line if provided
            if (lines.currentPrice) {
                window.updateCurrentPriceLine(lines.currentPrice);
            }
            
            // Remove existing entry line if it exists
            if (window.priceLines.entryPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.entryPrice);
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error removing entry line:', error);
                }
                window.priceLines.entryPrice = null;
            }
            // Create new entry line if price is valid
            if (lines.entryPrice && !isNaN(parseFloat(lines.entryPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.entryPrice),
                        color: '${theme.colors.text.muted}', // Light Gray
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'Entry'
                    });
                    // Store reference for future removal
                    window.priceLines.entryPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
            // Remove existing take profit line if it exists
            if (window.priceLines.takeProfitPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.takeProfitPrice);
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error removing take profit line:', error);
                }
                window.priceLines.takeProfitPrice = null;
            }
            // Create new take profit line if price is valid
            if (lines.takeProfitPrice && !isNaN(parseFloat(lines.takeProfitPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.takeProfitPrice),
                        color: '${theme.colors.success.default}', // Light Green
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'TP'
                    });
                    window.priceLines.takeProfitPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error creating take profit line:', error);
                }
            }
            // Remove existing stop loss line if it exists
            if (window.priceLines.stopLossPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.stopLossPrice);
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error removing stop loss line:', error);
                }
                window.priceLines.stopLossPrice = null;
            }
            // Create new stop loss line if price is valid
            if (lines.stopLossPrice && !isNaN(parseFloat(lines.stopLossPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.stopLossPrice),
                        color: '${theme.colors.background.alternative}', // Dark Gray
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                    // Store reference for future removal
                    window.priceLines.stopLossPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error creating stop loss line:', error);
                }
            }
            // Remove existing liquidation line if it exists
            if (window.priceLines.liquidationPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.liquidationPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.liquidationPrice = null;
            }
            // Create new liquidation line if price is valid
            if (lines.liquidationPrice && !isNaN(parseFloat(lines.liquidationPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.liquidationPrice),
                        color: '${theme.colors.error.default}', // Red
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'Liq'
                    });
                    // Store reference for future removal
                    window.priceLines.liquidationPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error creating liquidation line:', error);
                }
            }
        };
        // Message handling from React Native
        window.addEventListener('message', function(event) {
            try {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'SET_CANDLESTICK_DATA':
                        if (window.chart && message.data?.length > 0) {
                            // Create or get candlestick series
                            if (!window.candlestickSeries) {
                                window.createCandlestickSeries();
                            }

                            // Create or get volume series (only if user wants it visible)
                            if (!window.volumeSeries && window.volumeVisible) {
                                window.createVolumeSeries();
                            }

                            if (window.candlestickSeries) {
                                // Store all data for zoom functionality
                                window.allCandleData = [...message.data];

                                // Use batch update for better performance during large data sets
                                try {
                                    window.candlestickSeries.setData(message.data);
                                } catch (error) {
                                    console.error('TradingView: Error setting candle data:', error);
                                    // Fallback: update data in smaller chunks
                                    const chunkSize = 500;
                                    for (let i = 0; i < message.data.length; i += chunkSize) {
                                        const chunk = message.data.slice(i, i + chunkSize);
                                        if (i === 0) {
                                            window.candlestickSeries.setData(chunk);
                                        } else {
                                            chunk.forEach(candle => window.candlestickSeries.update(candle));
                                        }
                                    }
                                }

                                // Defer volume series update to next frame for better performance
                                // This allows candlesticks to render first, preventing blank screen on Android
                                if (window.volumeSeries) {
                                    requestAnimationFrame(() => {
                                        try {
                                            const volumeData = message.data.map(candle => ({
                                                time: candle.time,
                                                value: (parseFloat(candle.volume) * parseFloat(candle.close)) || 0, // USD notional = volume × price
                                                color: window.coloredVolume
                                                    ? (candle.close >= candle.open ? '${theme.colors.success.default}' : '${theme.colors.error.default}')
                                                    : '${theme.colors.border.muted}'
                                            }));

                                            window.volumeSeries.setData(volumeData);

                                            // Enforce pane heights after volume data is set
                                            // This ensures the 80/20 split is maintained after data refresh
                                            setTimeout(() => {
                                                if (window.setPaneHeights) {
                                                    window.setPaneHeights();
                                                }
                                            }, 50);
                                        } catch (error) {
                                            // Silent error handling
                                        }
                                    });
                                }
                                
                                // Update visible candle count if provided
                                if (message.visibleCandleCount) {
                                    window.visibleCandleCount = message.visibleCandleCount;
                                }

                                // Detect interval change for zoom reset
                                const intervalChanged = message.interval && window.currentInterval !== message.interval;
                                if (message.interval) {
                                    window.currentInterval = message.interval;
                                }

                                // Auto-scale on initial load OR when interval changes
                                const shouldAutoscale = window.isInitialDataLoad || intervalChanged;

                                if (shouldAutoscale) {
                                    // Apply zoom to show configured candle count
                                    window.applyZoom(window.visibleCandleCount, true);
                                }

                                // Update visible price range for dynamic formatting
                                window.updateVisiblePriceRange();

                                // Mark initial load as complete
                                window.isInitialDataLoad = false;
                                
                                // Update current price line with the latest candle's close price
                                if (message.data && message.data.length > 0) {
                                    const latestCandle = message.data[message.data.length - 1];
                                    if (latestCandle && latestCandle.close) {
                                        window.updateCurrentPriceLine(latestCandle.close.toString());
                                    }
                                }
                            }
                        }
                        break;
                    case 'CLEAR_DATA':
                        // Clear chart data (e.g., during market switch)
                        if (window.candlestickSeries) {
                            window.candlestickSeries.setData([]);
                            window.allCandleData = [];
                        }
                        break;
                    case 'ADD_AUXILIARY_LINES':
                        if (window.chart && message.lines) {
                            window.updatePriceLines(message.lines);
                        }
                        break;
                    case 'RESET_TO_DEFAULT':
                        // Reset chart to default state (like initial navigation)
                        if (window.chart && window.allCandleData && window.allCandleData.length > 0) {
                            window.visibleCandleCount = window.ZOOM_LIMITS.DEFAULT_CANDLES;
                            window.applyZoom(window.ZOOM_LIMITS.DEFAULT_CANDLES, true); // Force reset
                        }
                        break;
                    case 'ZOOM_TO_LATEST_CANDLE':
                        // Zoom to show the latest candles when period changes
                        if (window.chart && window.allCandleData && window.allCandleData.length > 0) {
                            const candleCount = message.candleCount || window.visibleCandleCount;
                            window.applyZoom(candleCount, true); // Force zoom to latest
                        }
                        break;
                    case 'CLEAR_TPSL_LINES':
                        // Clear all TPSL lines except current price line
                        if (window.candlestickSeries) {
                            // Remove entry price line
                            if (window.priceLines.entryPrice) {
                                try {
                                    window.candlestickSeries.removePriceLine(window.priceLines.entryPrice);
                                    window.priceLines.entryPrice = null;
                                } catch (error) {
                                    console.error('TradingView: Error removing entry line:', error);
                                }
                            }
                            
                            // Remove take profit line
                            if (window.priceLines.takeProfitPrice) {
                                try {
                                    window.candlestickSeries.removePriceLine(window.priceLines.takeProfitPrice);
                                    window.priceLines.takeProfitPrice = null;
                                } catch (error) {
                                    console.error('TradingView: Error removing take profit line:', error);
                                }
                            }
                            
                            // Remove stop loss line
                            if (window.priceLines.stopLossPrice) {
                                try {
                                    window.candlestickSeries.removePriceLine(window.priceLines.stopLossPrice);
                                    window.priceLines.stopLossPrice = null;
                                } catch (error) {
                                    console.error('TradingView: Error removing stop loss line:', error);
                                }
                            }
                            
                            // Remove liquidation line
                            if (window.priceLines.liquidationPrice) {
                                try {
                                    window.candlestickSeries.removePriceLine(window.priceLines.liquidationPrice);
                                    window.priceLines.liquidationPrice = null;
                                } catch (error) {
                                    console.error('TradingView: Error removing liquidation line:', error);
                                }
                            }

                            // Note: currentPrice line is intentionally preserved
                        }
                        break;
                    case 'UPDATE_INTERVAL':
                        // Send confirmation back to React Native
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'INTERVAL_UPDATED',
                                duration: message.duration,
                                candlePeriod: message.candlePeriod,
                                candleCount: message.candleCount,
                                timestamp: new Date().toISOString()
                            }));
                        }
                        break;
                    case 'TOGGLE_VOLUME_VISIBILITY':
                        // Toggle volume by removing/recreating pane (prevents empty pane space)
                        if (window.chart) {
                            const isVisible = message.visible;

                            try {
                                if (isVisible) {
                                    // Set visibility state FIRST (before creating series)
                                    window.volumeVisible = true;

                                    // Show volume - recreate series and pane if it doesn't exist
                                    if (!window.volumeSeries) {
                                        // Recreate volume series
                                        window.createVolumeSeries();

                                        // Set volume data if we have it
                                        if (window.allCandleData && window.allCandleData.length > 0) {
                                            const volumeData = window.allCandleData.map(candle => ({
                                                time: candle.time,
                                                value: (parseFloat(candle.volume) * parseFloat(candle.close)) || 0, // USD notional = volume × price
                                                color: window.coloredVolume
                                                    ? (candle.close >= candle.open ? '${theme.colors.success.default}' : '${theme.colors.error.default}')
                                                    : '${theme.colors.border.muted}'
                                            }));
                                            window.volumeSeries.setData(volumeData);
                                        }

                                        // Restore candlestick scale margins for 80/20 split
                                        if (window.candlestickSeries) {
                                            window.candlestickSeries.priceScale().applyOptions({
                                                scaleMargins: {
                                                    top: 0.05,    // 5% padding at top
                                                    bottom: 0.30, // Reserve 30% at bottom for volume
                                                },
                                            });
                                        }
                                    }
                                } else {
                                    // Hide volume - remove series AND pane entirely
                                    if (window.volumeSeries) {
                                        try {
                                            // Remove the series (pane is automatically removed by TradingView)
                                            window.chart.removeSeries(window.volumeSeries);
                                            window.volumeSeries = null;

                                            // Set visibility state AFTER removing series
                                            window.volumeVisible = false;

                                            // Reset candlestick pane to full height (100%)
                                            // Use setTimeout to allow TradingView to complete pane removal
                                            setTimeout(function() {
                                                try {
                                                    const panes = window.chart.panes();
                                                    if (panes.length === 1) {
                                                        // Only one pane left - expand to full height
                                                        const chartHeight = window.chart.options().height;

                                                        // Set pane to full chart height
                                                        panes[0].setHeight(chartHeight);

                                                        // CRITICAL FIX: Reset candlestick scale margins to use full pane
                                                        if (window.candlestickSeries) {
                                                            window.candlestickSeries.priceScale().applyOptions({
                                                                scaleMargins: {
                                                                    top: 0.05,    // 5% padding at top
                                                                    bottom: 0.05, // Reset from 30% to 5%
                                                                },
                                                            });
                                                        }

                                                        // Force chart to recalculate layout by triggering resize
                                                        window.chart.applyOptions({
                                                            width: window.chart.options().width,
                                                            height: chartHeight
                                                        });

                                                        // Update visible price range instead of fitContent to preserve scroll
                                                        window.updateVisiblePriceRange();
                                                    }
                                                } catch (heightError) {
                                                    // Silent error handling
                                                }
                                            }, 100);
                                        } catch (removeError) {
                                            // Silent error handling
                                        }
                                    }
                                }
                            } catch (error) {
                                // Silent error handling
                            }
                        }
                        break;
                }
            } catch (error) {
                // Silent error handling
            }
        });
        // Also listen for React Native WebView messages
        document.addEventListener('message', function(event) {
            window.dispatchEvent(new MessageEvent('message', event));
        });
        // Start loading after a small delay
        // Library is already loaded inline, so start creating chart
        createChart();
    </script>
</body>
</html>`;
