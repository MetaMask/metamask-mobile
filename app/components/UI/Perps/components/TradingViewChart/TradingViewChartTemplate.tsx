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
                            color: '${theme.colors.background.default}',
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
                    // Enhanced kinetic scrolling for better touch response
                    kinetic: {
                        mouse: true,
                        touch: true,
                    },
                    // Disable crosshair for better performance on low-end devices
                    crosshair: {
                        mode: 2, // Hidden mode - no crosshair at all
                    },
                    localization: {
                        priceFormatter: (price) => {
                            // Format price with comma separators
                            return new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(price);
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
                            pressedMouseMove: false, // Disable drag scroll (mobile app)
                            horzTouchDrag: true, // Enable horizontal touch drag
                            vertTouchDrag: false, // Disable vertical touch drag
                        },
                        // Simplified panning configuration
                        shiftVisibleRangeOnNewBar: false, // Prevent automatic shifting
                        allowShiftVisibleRangeOnWhitespaceReplacement: false, // Prevent unexpected jumps
                        fixLeftEdge: false, // Allow free scrolling
                        fixRightEdge: false, // Allow free scrolling  
                        lockVisibleTimeRangeOnResize: false, // Don't lock on resize
                        rightBarStaysOnScroll: false, // Don't auto-follow latest data during scroll
                        uniformDistribution: false, // Allow natural time distribution
                        // Simplified tick formatting for better performance
                        tickMarkFormatter: (time) => {
                            const date = new Date(time * 1000);
                            return date.toLocaleTimeString('en-US', { 
                                hour12: false, 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
                        },
                    },
                    rightPriceScale: {
                        borderColor: 'transparent',
                    },
                    leftPriceScale: {
                        borderColor: 'transparent',
                    }
                });

                // Simple range tracking without complex panning detection
                window.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
                    if (!logicalRange) return;
                    
                    // Simply track the current range without restrictions
                    window.lastLogicalRange = logicalRange;
                    const visibleCandleCount = Math.ceil(logicalRange.to - logicalRange.from);
                    window.visibleCandleCount = visibleCandleCount;
                });

                // Touch event optimization for better performance
                const container = document.getElementById('container');
                let touchStartTime = 0;
                let touchMoveTimeout = null;
                
                // Debounced touch move handler
                const debouncedTouchMove = (e) => {
                    if (touchMoveTimeout) {
                        clearTimeout(touchMoveTimeout);
                    }
                    
                    touchMoveTimeout = setTimeout(() => {
                        // Minimal processing during touch move
                        // Let TradingView handle the actual panning
                    }, 16); // ~60fps throttling
                };
                
                // Add passive event listeners for better performance
                container.addEventListener('touchstart', (e) => {
                    touchStartTime = performance.now();
                }, { passive: true });
                
                container.addEventListener('touchmove', debouncedTouchMove, { passive: true });
                
                container.addEventListener('touchend', (e) => {
                    const touchDuration = performance.now() - touchStartTime;
                    // Clear any pending touch move timeouts
                    if (touchMoveTimeout) {
                        clearTimeout(touchMoveTimeout);
                        touchMoveTimeout = null;
                    }
                }, { passive: true });
                
                container.addEventListener('touchcancel', (e) => {
                    if (touchMoveTimeout) {
                        clearTimeout(touchMoveTimeout);
                        touchMoveTimeout = null;
                    }
                }, { passive: true });

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
                upColor: '#BAF24A',
                downColor: '#FF7584',
                borderVisible: false,
                wickUpColor: '#BAF24A',
                wickDownColor: '#FF7584',
                priceLineColor: '#FFF',
                priceLineWidth: 1,
                lastValueVisible: true,
                title: 'Current',
                // Performance optimizations for smooth panning
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01,
                },
                // Reduce visual updates during panning for better performance
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 3,
                crosshairMarkerBorderColor: '#FFF',
                crosshairMarkerBackgroundColor: '#FF7584',
            });
            return window.candlestickSeries;
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
