import { Theme } from '../../../../../util/theme/models';

export const createTradingViewChartTemplate = (
  theme: Theme,
  lightweightChartsLib: string,
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
        }
        #container {
            width: 100%;
            height: 100vh;
            position: relative;
            background: ${theme.colors.background.default};
            /* Touch optimization for chart container */
            touch-action: pan-x;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
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
        window.isInitialDataLoad = true; // Track if this is the first data load
        window.lastDataKey = null; // Track the last dataset to avoid unnecessary autoscaling
        window.visibleCandleCount = 45; // Default visible candle count
        window.allCandleData = []; // Store all loaded data for zoom functionality
        
        // Zoom limits - consistent with chart configuration
        window.ZOOM_LIMITS = {
            MIN_CANDLES: 10,  // Minimum candles visible when zoomed in
            MAX_CANDLES: 250, // Maximum candles visible when zoomed out
            DEFAULT_CANDLES: 45 // Default visible candles
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
        // Step 2: Create chart
        function createChart() {
            if (!window.LightweightCharts) {
                console.error('TradingView: Library not available');
                return;
            }
            try {
                // Create chart with theme applied via template literals
                window.chart = LightweightCharts.createChart(document.getElementById('container'), {
                    width: window.innerWidth,
                    height: window.innerHeight,
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
                    autoSize: false, // Disable auto-resize for better performance
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
                            // Smart decimal precision based on price value and range
                            const absPrice = Math.abs(price);
                            
                            if (absPrice >= 1000) {
                                // For large values (like ETH), show no decimals
                                return new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(price);
                            } else if (absPrice >= 100) {
                                // For medium values, show 1 decimal place
                                return new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }).format(price);
                            } else if (absPrice >= 1) {
                                // For small values, show 2 decimal places
                                return new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }).format(price);
                            } else if (absPrice >= 0.01) {
                                // For very small values, show 4 decimal places
                                return new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4
                                }).format(price);
                            } else {
                                // For extremely small values (like PUMP-USD), show 6 decimal places
                                return new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 6,
                                    maximumFractionDigits: 6
                                }).format(price);
                            }
                        },
                        timeFormatter: (time) => {
                            // Format time in user's local timezone for crosshair labels
                            const date = new Date(time * 1000);
                            return date.toLocaleString('en-US', { 
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false,
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            });
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
                        // Mobile-optimized scroll and zoom handling
                        handleScale: {
                            axisPressedMouseMove: {
                                time: true, // Enable time scale dragging
                                price: false, // Disable price scale dragging to prevent conflicts
                            },
                            mouseWheel: false, // Disable mouse wheel zoom (mobile app)
                            pinch: true, // Enable pinch zoom on mobile
                        },
                        handleScroll: {
                            mouseWheel: false, // Disable mouse wheel scroll (mobile app)
                            pressedMouseMove: false, // Enable drag scroll for direct touch control
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
                        // Format time with date in user's local timezone
                        tickMarkFormatter: (time) => {
                            const date = new Date(time * 1000);
                            return date.toLocaleString('en-US', { 
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false,
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use user's local timezone
                            });
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
                    },
                    leftPriceScale: {
                        borderColor: 'transparent',
                        visible: false, // Disable left scale to avoid conflicts
                    }
                });

                // Notify React Native that chart is ready
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CHART_READY',
                        timestamp: new Date().toISOString()
                    }));
                } 
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
            // Create new candlestick series with performance optimizations
            window.candlestickSeries = window.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: '${theme.colors.success.default}',
                downColor: '${theme.colors.error.default}',
                borderVisible: false,
                wickUpColor: '${theme.colors.success.default}',
                wickDownColor: '${theme.colors.error.default}',
                priceLineColor: '${theme.colors.icon.alternative}',
                priceLineWidth: 1,
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
            });
            
            // Function to format numbers to 5 significant digits
            function formatToSignificantDigits(num, digits = 5) {
                if (num === 0) return '0';
                const magnitude = Math.floor(Math.log10(Math.abs(num)));
                const factor = Math.pow(10, digits - 1 - magnitude);
                return (Math.round(num * factor) / factor).toString();
            }

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
                        const ohlcData = {
                            open: formatToSignificantDigits(data.open),
                            high: formatToSignificantDigits(data.high),
                            low: formatToSignificantDigits(data.low),
                            close: formatToSignificantDigits(data.close),
                            time: param.time
                        };
                        
                        // Console log for debugging
                        console.log('OHLC Data:', ohlcData);
                        
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
                console.log('📊 TradingView: Creating current price line at:', currentPrice);
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(currentPrice),
                        color: '#FFF', // White
                        lineWidth: 1,
                        lineStyle: 0, // Solid line
                        axisLabelVisible: true,
                        title: 'Current'
                    });
                    // Store reference for future removal
                    window.priceLines.currentPrice = priceLine;
                    console.log('📊 TradingView: Current price line created successfully');
                } catch (error) {
                    // Silent error handling
                    console.error('TradingView: Error creating current price line:', error);
                }
            } else {
                console.log('📊 TradingView: No valid current price provided:', currentPrice);
            }
        };

        // Optimized resize handler with throttling
        let resizeTimeout;
        window.addEventListener('resize', function() {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.chart) {
                    window.chart.applyOptions({
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            }, 100); // Throttle resize to prevent excessive redraws
        });
        
        // Simple cleanup function
        window.cleanupChartEventListeners = function() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
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
            
            // Store current price line data for restoration
            window.originalPriceLineData = {
                entryPrice: window.priceLines.entryPrice,
                liquidationPrice: window.priceLines.liquidationPrice,
                takeProfitPrice: window.priceLines.takeProfitPrice,
                stopLossPrice: window.priceLines.stopLossPrice,
                currentPrice: window.priceLines.currentPrice
            };
            
            // Remove all price lines
            Object.keys(window.priceLines).forEach(key => {
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
                        color: '#CCC',
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
                        color: '#FF7584',
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
                        color: '#BAF24A',
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
                        color: '#484848',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Recreate current price line from stored data
            if (window.originalPriceLineData.currentPrice) {
                try {
                    window.priceLines.currentPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.currentPrice.price,
                        color: '#FFF',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: 'Current'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Recreate current price line from stored data
            if (window.originalPriceLineData.currentPrice) {
                try {
                    window.priceLines.currentPrice = window.candlestickSeries.createPriceLine({
                        price: window.originalPriceLineData.currentPrice.price,
                        color: '#FFF',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: 'Current'
                    });
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Clear stored data
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
            
            // Get the last N candles to display (most recent data)
            const startIndex = Math.max(0, window.allCandleData.length - actualCandleCount);
            const visibleData = window.allCandleData.slice(startIndex);
            
            if (window.candlestickSeries && visibleData.length > 0) {
                const firstTime = visibleData[0].time;
                const lastTime = visibleData[visibleData.length - 1].time;
                
                try {
                    window.chart.timeScale().setVisibleRange({
                        from: firstTime,
                        to: lastTime,
                    });
                } catch (error) {
                    console.error('TradingView: Error setting visible range:', error);
                    // Fallback to fit content if setVisibleRange fails
                    window.chart.timeScale().fitContent();
                }
            }
            
            window.visibleCandleCount = actualCandleCount;
        };

        // Update TPSL price lines
        window.updatePriceLines = function(lines) {
            if (!window.candlestickSeries) {
                return;
            }
            
            // Debug: Log the received lines data
            console.log('📊 TradingView: updatePriceLines called with:', lines);
            
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
                        color: '#CCC', // Light Gray
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
                        color: '#BAF24A', // Light Green
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
                        color: '#484848', // Dark Gray
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
                        color: '#FF7584', // Red
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
                                
                                // Update visible candle count if provided
                                if (message.visibleCandleCount) {
                                    window.visibleCandleCount = message.visibleCandleCount;
                                }
                                
                                // Simple auto-scale logic: ONLY on initial load
                                const shouldAutoscale = window.isInitialDataLoad;
                                
                                if (shouldAutoscale) {
                                    // Apply zoom to show only 45 candles on initial load
                                    window.applyZoom(window.visibleCandleCount, true);
                                    console.log('📊 TradingView: Applied initial zoom to', window.visibleCandleCount, 'candles');
                                }
                                
                                // Mark initial load as complete
                                window.isInitialDataLoad = false;
                                
                                // Update current price line with the latest candle's close price
                                if (message.data && message.data.length > 0) {
                                    const latestCandle = message.data[message.data.length - 1];
                                    if (latestCandle && latestCandle.close) {
                                        window.updateCurrentPriceLine(latestCandle.close.toString());
                                    }
                                }
                            } else {
                                console.error('📊 TradingView: Failed to create candlestick series');
                            }
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
                            console.log('📊 TradingView: Reset to default state - 45 candles');
                        }
                        break;
                    case 'ZOOM_TO_LATEST_CANDLE':
                        // Zoom to show the latest candles when period changes
                        if (window.chart && window.allCandleData && window.allCandleData.length > 0) {
                            const candleCount = message.candleCount || window.visibleCandleCount;
                            window.applyZoom(candleCount, true); // Force zoom to latest
                            console.log('📊 TradingView: Zoomed to latest', candleCount, 'candles');
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
                            console.log('📊 TradingView: Cleared TPSL lines (preserved current price line)');
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
                }
            } catch (error) {
                console.error('📊 TradingView: Message handling error:', error);
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
