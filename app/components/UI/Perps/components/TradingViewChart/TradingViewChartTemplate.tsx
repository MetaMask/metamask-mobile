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
                    },
                    rightPriceScale: {
                        borderColor: 'transparent',
                    },
                    leftPriceScale: {
                        borderColor: 'transparent',
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
            // Create new candlestick series
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
            });
            return window.candlestickSeries;
        };
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.chart) {
                window.chart.applyOptions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
        });
        // Store price lines for management
        window.priceLines = {
            entryPrice: null,
            liquidationPrice: null, 
            takeProfitPrice: null,
            stopLossPrice: null,
            currentPrice: null
        };
        // Apply zoom to show specific number of candles
        window.applyZoom = function(candleCount) {
            if (!window.chart || !window.allCandleData || window.allCandleData.length === 0) {
                return;
            }
            
            // Ensure candleCount is within bounds
            const minCandles = 10;
            const maxCandles = Math.min(250, window.allCandleData.length);
            const actualCandleCount = Math.max(minCandles, Math.min(maxCandles, candleCount));
            
            // Get the last N candles to display (most recent data)
            const visibleData = window.allCandleData.slice(-actualCandleCount);
            
            if (window.candlestickSeries && visibleData.length > 0) {
                // Set the visible range to show only the selected number of candles
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
                                window.candlestickSeries.setData(message.data);
                                
                                // Update visible candle count if provided
                                if (message.visibleCandleCount) {
                                    window.visibleCandleCount = message.visibleCandleCount;
                                }
                                
                                // Check if this is truly new data (different source/period) or just a rerender
                                const currentDataKey = message.source + '_' + (message.data?.length || 0) + '_' + window.visibleCandleCount;
                                const shouldAutoscale = window.isInitialDataLoad || (window.lastDataKey !== currentDataKey);
                                
                                if (shouldAutoscale) {
                                    // Apply zoom to show the specified number of candles
                                    window.applyZoom(window.visibleCandleCount);
                                    window.lastDataKey = currentDataKey;
                                }
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
