(function () {
    "use strict";

    /**
     * 示例行情模块
     *
     * 用途：
     * 1. 生成演示用 K 线数据。
     * 2. 根据交易品种设置初始价格和波动率。
     * 3. 根据 K 线周期生成对应的时间间隔。
     * 4. 使用固定随机种子，让相同参数生成相同走势。
     *
     * 注意：
     * 当前生成的是模拟行情，不是真实交易所历史数据。
     */

    const symbolConfig = {
        BTCUSDT: {
            base: 68000,
            volatility: 0.025,
            precision: 2
        },

        ETHUSDT: {
            base: 3500,
            volatility: 0.032,
            precision: 2
        },

        BNBUSDT: {
            base: 600,
            volatility: 0.028,
            precision: 2
        }
    };

    /**
     * 生成固定种子的随机数函数。
     */
    function seededRandom(seed) {
        let state = seed >>> 0;

        return function () {
            state = (state * 1664525 + 1013904223) >>> 0;

            return state / 4294967296;
        };
    }

    /**
     * 将字符串转换为整数种子。
     */
    function hashString(text) {
        let hash = 0;

        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        }

        return Math.abs(hash);
    }

    /**
     * 获取 K 线周期对应的秒数。
     */
    function timeframeSeconds(timeframe) {
        const map = {
            "1D": 86400,
            "4H": 14400,
            "1H": 3600,
            "15m": 900
        };

        return map[timeframe] || 86400;
    }

    /**
     * 生成示例 K 线。
     *
     * @param {string} symbol 交易品种，例如 BTCUSDT
     * @param {string} timeframe K 线周期，例如 1D、4H、1H、15m
     * @returns {Array<Object>} K 线数组
     */
    function generateCandles(symbol, timeframe) {
        const config = symbolConfig[symbol];

        if (!config) {
            throw new Error("不支持的交易品种：" + symbol);
        }

        const step = timeframeSeconds(timeframe);

        const random = seededRandom(
            hashString(symbol + timeframe + "strategy-demo")
        );

        const count = 180;

        const now = Math.floor(Date.now() / 1000);

        const alignedNow = Math.floor(now / step) * step;

        const start = alignedNow - (count - 1) * step;

        let price = config.base;

        const candles = [];

        for (let i = 0; i < count; i++) {
            const open = price;

            const trend =
                Math.sin(i / 13) * config.volatility * 0.25;

            const movement =
                (random() - 0.48) * config.volatility * 2 + trend;

            const close = open * (1 + movement);

            const upper =
                random() * config.volatility * 0.8;

            const lower =
                random() * config.volatility * 0.8;

            const high =
                Math.max(open, close) * (1 + upper);

            const low =
                Math.min(open, close) * (1 - lower);

            price = close;

            candles.push({
                time: start + i * step,

                open: Number(open.toFixed(config.precision)),

                high: Number(high.toFixed(config.precision)),

                low: Number(low.toFixed(config.precision)),

                close: Number(close.toFixed(config.precision))
            });
        }

        return candles;
    }

    /**
     * 暴露公共接口，供其他 JavaScript 文件调用。
     */
    window.MarketData = {
        generateCandles: generateCandles,
        timeframeSeconds: timeframeSeconds
    };
})();