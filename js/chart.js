(function () {
    "use strict";

    /**
     * K线图管理模块
     *
     * 负责：
     * 1. 初始化 Lightweight Charts
     * 2. 显示K线数据
     * 3. 更新图表
     * 4. 显示买卖标记
     * 5. 自适应容器大小
     */

    let chart = null;
    let candleSeries = null;
    let resizeObserver = null;

    /**
     * 初始化图表。
     *
     * @param {string} containerId 图表容器的HTML元素ID
     */
    function initChart(containerId) {
        const container = document.getElementById(containerId || "chart");

        if (!container) {
            throw new Error("找不到K线图容器。");
        }

        if (!window.LightweightCharts) {
            container.innerHTML =
                '<div class="empty-state">图表加载失败，请检查网络连接后刷新页面。</div>';

            return false;
        }

        if (chart) {
            return true;
        }

        chart = window.LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,

            layout: {
                background: {
                    type: "solid",
                    color: "#151a21"
                },
                textColor: "#848e9c",
                fontSize: 12
            },

            grid: {
                vertLines: {
                    color: "#20262e"
                },
                horzLines: {
                    color: "#20262e"
                }
            },

            rightPriceScale: {
                borderColor: "#2b3139"
            },

            timeScale: {
                borderColor: "#2b3139",
                timeVisible: true,
                secondsVisible: false
            },

            crosshair: {
                vertLine: {
                    color: "#596579",
                    width: 1,
                    style: window.LightweightCharts.LineStyle.Dashed
                },
                horzLine: {
                    color: "#596579",
                    width: 1,
                    style: window.LightweightCharts.LineStyle.Dashed
                }
            },

            localization: {
                locale: "zh-CN"
            },

            handleScroll: true,
            handleScale: true
        });

        candleSeries = chart.addSeries(
            window.LightweightCharts.CandlestickSeries,
            {
                upColor: "#0ecb81",
                downColor: "#f6465d",
                borderUpColor: "#0ecb81",
                borderDownColor: "#f6465d",
                wickUpColor: "#0ecb81",
                wickDownColor: "#f6465d"
            }
        );

        /*
         * 监听图表容器尺寸变化。
         */
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(function () {
                if (chart && container.clientWidth > 0) {
                    chart.applyOptions({
                        width: container.clientWidth,
                        height: container.clientHeight
                    });
                }
            });

            resizeObserver.observe(container);
        } else {
            window.addEventListener("resize", function () {
                if (chart && container.clientWidth > 0) {
                    chart.applyOptions({
                        width: container.clientWidth,
                        height: container.clientHeight
                    });
                }
            });
        }

        return true;
    }

    /**
     * 设置K线数据。
     *
     * @param {Array<Object>} candles K线数组
     */
    function setCandles(candles) {
        if (!candleSeries || !chart) {
            return false;
        }

        if (!Array.isArray(candles)) {
            throw new Error("K线数据必须是数组。");
        }

        candleSeries.setData(candles);

        chart.timeScale().fitContent();

        return true;
    }

    /**
     * 设置买卖标记。
     *
     * @param {Array<Object>} markers 买卖标记数组
     */
    function setMarkers(markers) {
        if (!candleSeries) {
            return false;
        }

        if (!Array.isArray(markers)) {
            throw new Error("买卖标记必须是数组。");
        }

        const sortedMarkers = markers.slice().sort(function (a, b) {
            return a.time - b.time;
        });

        candleSeries.setMarkers(sortedMarkers);

        return true;
    }

    /**
     * 清除买卖标记。
     */
    function clearMarkers() {
        if (candleSeries) {
            candleSeries.setMarkers([]);
        }
    }

    /**
     * 让图表显示全部K线。
     */
    function fitContent() {
        if (chart) {
            chart.timeScale().fitContent();
        }
    }

    /**
     * 销毁图表并释放监听器。
     */
    function destroyChart() {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (chart) {
            chart.remove();
            chart = null;
            candleSeries = null;
        }
    }

    /**
     * 暴露公共接口。
     */
    window.ChartManager = {
        initChart: initChart,
        setCandles: setCandles,
        setMarkers: setMarkers,
        clearMarkers: clearMarkers,
        fitContent: fitContent,
        destroyChart: destroyChart
    };
})();