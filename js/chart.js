// 策略回测：K线图模块
// 使用 TradingView Lightweight Charts

const chartContainer = document.getElementById("chart");

if (chartContainer && window.LightweightCharts) {
    const chart = LightweightCharts.createChart(chartContainer, {
        layout: {
            background: {
                color: "#1e222d"
            },
            textColor: "#d1d4dc"
        },

        grid: {
            vertLines: {
                color: "#2a2e39"
            },
            horzLines: {
                color: "#2a2e39"
            }
        },

        rightPriceScale: {
            borderColor: "#363a45"
        },

        timeScale: {
            borderColor: "#363a45",
            timeVisible: true,
            secondsVisible: false
        },

        width: chartContainer.clientWidth,
        height: 420
    });

    const candleSeries = chart.addSeries(
        LightweightCharts.CandlestickSeries,
        {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderUpColor: "#26a69a",
            borderDownColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350"
        }
    );

    // 临时示例数据，仅用于检查图表是否正常显示。
    // 不是实际市场行情，不能用于判断真实策略表现。
    const sampleData = [
        { time: "2026-01-01", open: 100, high: 108, low: 98, close: 105 },
        { time: "2026-01-02", open: 105, high: 110, low: 102, close: 107 },
        { time: "2026-01-03", open: 107, high: 109, low: 99, close: 101 },
        { time: "2026-01-04", open: 101, high: 106, low: 97, close: 104 },
        { time: "2026-01-05", open: 104, high: 115, low: 103, close: 113 },
        { time: "2026-01-06", open: 113, high: 118, low: 109, close: 111 },
        { time: "2026-01-07", open: 111, high: 114, low: 104, close: 106 },
        { time: "2026-01-08", open: 106, high: 112, low: 105, close: 110 },
        { time: "2026-01-09", open: 110, high: 120, low: 108, close: 118 },
        { time: "2026-01-10", open: 118, high: 121, low: 112, close: 115 }
    ];

    candleSeries.setData(sampleData);

    chart.timeScale().fitContent();

    // 窗口变化时自动调整图表尺寸
    const resizeObserver = new ResizeObserver(() => {
        chart.applyOptions({
            width: chartContainer.clientWidth
        });
    });

    resizeObserver.observe(chartContainer);

    // 保存引用，方便后续模块扩展
    window.backtestChart = chart;
    window.backtestCandleSeries = candleSeries;
}