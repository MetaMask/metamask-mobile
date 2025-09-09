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
        }
        #container {
            width: 100%;
            height: 100vh;
            position: relative;
            background: ${theme.colors.background.default};
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
                    // Add performance optimizations for aggressive panning
                    autoSize: false, // Disable auto-resize for better performance
                    handleScroll: true,
                    handleScale: true,
                    // Disable smooth scrolling conflicts
                    kinetic: {
                        mouse: true,
                        touch: true,
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
                        // Optimized scroll and zoom handling for smooth panning
                        handleScale: {
                            axisPressedMouseMove: {
                                time: true, // Enable time scale dragging for smooth panning
                                price: true, // Allow price scale dragging
                            },
                            mouseWheel: true, // Enable mouse wheel zoom
                            pinch: true, // Enable pinch zoom on mobile
                        },
                        handleScroll: {
                            mouseWheel: true, // Enable mouse wheel scroll
                            pressedMouseMove: true, // Enable drag scroll (important for smooth panning)
                            horzTouchDrag: true, // Enable horizontal touch drag
                            vertTouchDrag: false, // Disable vertical touch drag
                        },
                        // Aggressive panning optimizations
                        shiftVisibleRangeOnNewBar: false, // Prevent automatic shifting
                        allowShiftVisibleRangeOnWhitespaceReplacement: false, // Prevent unexpected jumps
                        fixLeftEdge: false, // Allow free scrolling
                        fixRightEdge: false, // Allow free scrolling  
                        lockVisibleTimeRangeOnResize: true, // Maintain position on resize
                        rightBarStaysOnScroll: false, // Don't auto-follow latest data during scroll
                        uniformDistribution: false, // Allow natural time distribution
                        tickMarkFormatter: (time) => {
                            // Ultra-lightweight tick formatting
                            return new Date(time * 1000).toLocaleTimeString('en-US', { 
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

                // Add interaction event listeners for smooth panning detection
                const container = document.getElementById('container');
                
                // Mouse and touch event handlers for panning detection
                const handlePanStart = () => {
                    window.isUserPanning = true;
                    window.hasUserInteracted = true; // Mark that user has interacted
                    window.panStartTime = performance.now();
                    if (window.panEndTimeout) {
                        clearTimeout(window.panEndTimeout);
                        window.panEndTimeout = null;
                    }
                };
                
                const handlePanEnd = () => {
                    // Don't immediately set panning to false - use a delay to handle momentum scrolling
                    if (window.panEndTimeout) {
                        clearTimeout(window.panEndTimeout);
                    }
                    
                    window.panEndTimeout = setTimeout(() => {
                        window.isUserPanning = false;
                        // Apply zoom restrictions after panning stops
                        window.applyZoomRestrictionsIfNeeded();
                    }, window.panningDisableTime);
                };
                
                // Mouse events
                container.addEventListener('mousedown', handlePanStart);
                container.addEventListener('mouseup', handlePanEnd);
                container.addEventListener('mouseleave', handlePanEnd);
                
                // Touch events for mobile
                container.addEventListener('touchstart', handlePanStart, { passive: true });
                container.addEventListener('touchend', handlePanEnd, { passive: true });
                container.addEventListener('touchcancel', handlePanEnd, { passive: true });
                
                // Wheel events (for momentum scrolling detection and zoom tracking)
                container.addEventListener('wheel', (e) => {
                    // Mark user interaction for any wheel event
                    window.hasUserInteracted = true;
                    
                    // Detect if this is likely momentum scrolling vs intentional zoom
                    const isLikelyMomentum = Math.abs(e.deltaY) > 10 && Math.abs(e.deltaX) < 5;
                    if (isLikelyMomentum) {
                        handlePanStart();
                        // Short delay for momentum scrolling
                        if (window.panEndTimeout) clearTimeout(window.panEndTimeout);
                        window.panEndTimeout = setTimeout(() => {
                            window.isUserPanning = false;
                        }, 100);
                    }
                }, { passive: true });
                
                // Additional interaction tracking for comprehensive coverage
                container.addEventListener('click', () => {
                    window.hasUserInteracted = true;
                });
                
                container.addEventListener('dblclick', () => {
                    window.hasUserInteracted = true;
                });
                
                // Defer interaction tracking setup until chart is fully initialized
                setTimeout(() => {
                    // Track any programmatic range changes as user interaction
                    // (This catches zoom via UI controls, etc.)
                    if (window.chart && window.chart.timeScale && typeof window.chart.timeScale === 'function') {
                        const timeScale = window.chart.timeScale();
                        if (timeScale && timeScale.setVisibleRange && timeScale.setVisibleLogicalRange) {
                            const originalSetVisibleRange = timeScale.setVisibleRange.bind(timeScale);
                            const originalSetVisibleLogicalRange = timeScale.setVisibleLogicalRange.bind(timeScale);
                            
                            // Override these methods to track user-initiated changes
                            timeScale.setVisibleRange = function(...args) {
                                try {
                                    // Only mark as user interaction if not called from our internal functions
                                    const stack = new Error().stack;
                                    if (!stack.includes('applyZoom') && !stack.includes('applyZoomRestrictionsIfNeeded')) {
                                        window.hasUserInteracted = true;
                                    }
                                } catch (e) {
                                    // Stack trace analysis failed, assume user interaction
                                    window.hasUserInteracted = true;
                                }
                                return originalSetVisibleRange.apply(this, args);
                            };
                            
                            timeScale.setVisibleLogicalRange = function(...args) {
                                try {
                                    const stack = new Error().stack;
                                    if (!stack.includes('applyZoom') && !stack.includes('applyZoomRestrictionsIfNeeded')) {
                                        window.hasUserInteracted = true;
                                    }
                                } catch (e) {
                                    // Stack trace analysis failed, assume user interaction
                                    window.hasUserInteracted = true;
                                }
                                return originalSetVisibleLogicalRange.apply(this, args);
                            };
                        }
                    }
                }, 100); // Small delay to ensure chart is fully initialized

                // Function to apply zoom restrictions when not actively panning
                window.applyZoomRestrictionsIfNeeded = function() {
                    if (window.isUserPanning) return;
                    
                    const logicalRange = window.chart.timeScale().getVisibleLogicalRange();
                    if (!logicalRange || !window.allCandleData || window.allCandleData.length === 0) {
                        return;
                    }
                    
                    const visibleCandleCount = Math.ceil(logicalRange.to - logicalRange.from);
                    
                    // Apply strict zoom limits when user is not actively panning
                    if (visibleCandleCount > window.ZOOM_LIMITS.MAX_CANDLES) {
                        const maxRange = window.ZOOM_LIMITS.MAX_CANDLES;
                        const centerPoint = (logicalRange.from + logicalRange.to) / 2;
                        const halfRange = maxRange / 2;
                        
                        window.chart.timeScale().setVisibleLogicalRange({
                            from: centerPoint - halfRange,
                            to: centerPoint + halfRange,
                        });
                    } else if (visibleCandleCount < window.ZOOM_LIMITS.MIN_CANDLES) {
                        const minRange = window.ZOOM_LIMITS.MIN_CANDLES;
                        const centerPoint = (logicalRange.from + logicalRange.to) / 2;
                        const halfRange = minRange / 2;
                        
                        window.chart.timeScale().setVisibleLogicalRange({
                            from: centerPoint - halfRange,
                            to: centerPoint + halfRange,
                        });
                    }
                    
                    // Update stored visible candle count
                    window.visibleCandleCount = visibleCandleCount;
                };

                // Lightweight zoom tracking - NO interference during panning
                window.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
                    if (!logicalRange) return;
                    
                    // Simply track the current range - apply restrictions only when NOT panning
                    window.lastLogicalRange = logicalRange;
                    
                    // If user is actively panning, do NOTHING - let the chart scroll smoothly
                    if (window.isUserPanning) {
                        return;
                    }
                    
                    // Very minimal processing during non-panning - only track visible count
                    const visibleCandleCount = Math.ceil(logicalRange.to - logicalRange.from);
                    window.visibleCandleCount = visibleCandleCount;
                    
                    // Only apply restrictions on intentional zoom (significant changes when not panning)
                    const now = performance.now();
                    const timeSinceLastPan = now - window.panStartTime;
                    
                    // If it's been a while since panning and this looks like a zoom operation
                    if (timeSinceLastPan > window.panningDisableTime) {
                        const prevCount = window.visibleCandleCount || window.ZOOM_LIMITS.DEFAULT_CANDLES;
                        const countChange = Math.abs(visibleCandleCount - prevCount);
                        
                        // Only restrict on significant zoom changes (not minor adjustments)
                        if (countChange > 10) {
                            // Use debounced restriction application
                            setTimeout(() => {
                                if (!window.isUserPanning) {
                                    window.applyZoomRestrictionsIfNeeded();
                                }
                            }, 50);
                        }
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
        
        // Cleanup function for event listeners
        window.cleanupChartEventListeners = function() {
            if (window.panEndTimeout) {
                clearTimeout(window.panEndTimeout);
            }
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            // Remove event listeners if needed
            // (They'll be garbage collected with the DOM, but good practice)
        };
        
        // Utility function to reset interaction tracking (for debugging/testing)
        window.resetInteractionTracking = function() {
            window.hasUserInteracted = false;
            window.lastDataLength = 0;
            console.log('📊 TradingView: Interaction tracking reset - chart may auto-scale on next data update');
        };
        // Store price lines for management
        window.priceLines = {
            entryPrice: null,
            liquidationPrice: null, 
            takeProfitPrice: null,
            stopLossPrice: null,
            currentPrice: null
        };
        // Apply zoom to show specific number of candles (NON-DISRUPTIVE VERSION)
        window.applyZoom = function(candleCount, forceReset = false) {
            if (!window.chart || !window.allCandleData || window.allCandleData.length === 0) {
                return;
            }
            
            // CRITICAL: Don't disrupt user if they've interacted, unless explicitly forced
            if (window.hasUserInteracted && !forceReset) {
                // Just update the stored count, don't change the view
                window.visibleCandleCount = Math.max(
                    window.ZOOM_LIMITS.MIN_CANDLES, 
                    Math.min(window.ZOOM_LIMITS.MAX_CANDLES, candleCount)
                );
                return;
            }
            
            // Only apply visual changes on initial load or explicit reset
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
                                
                                // Ultra-simple auto-scale logic: ONLY on initial load
                                const shouldAutoscale = window.isInitialDataLoad;
                                
                                if (shouldAutoscale) {
                                    // Apply zoom ONLY on first time opening chart
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
