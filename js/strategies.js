(function () {
    "use strict";

    /**
     * 交易策略模块
     *
     * 支持：
     * 1. 双均线策略（ma）
     * 2. 动量策略（momentum）
     *
     * 本模块只生成交易信号，不执行交易。
     */

    /**
     * 计算移动平均线。
     *
     * @param {number[]} values 价格数组
     * @param {number} period 均线周期
     * @returns {(number|null)[]} 均线数组
     */
    function movingAverage(values, period) {
        if (
            !Array.isArray(values) ||
            !Number.isInteger(period) ||
            period < 1
        ) {
            throw new Error("均线参数无效。");
        }

        const result = new Array(values.length).fill(null);

        for (let i = period - 1; i < values.length; i++) {
            let total = 0;

            for (let j = i - period + 1; j <= i; j++) {
                total += values[j];
            }

            result[i] = total / period;
        }

        return result;
    }

    /**
     * 根据策略生成买卖信号。
     *
     * @param {Array<Object>} candles K线数组
     * @param {string} strategy 策略名称：ma 或 momentum
     * @returns {Array<Object>} 信号数组
     */
    function getSignals(candles, strategy) {
        if (!Array.isArray(candles) || candles.length === 0) {
            return [];
        }

        const closes = candles.map(function (candle) {
            return candle.close;
        });

        if (
            closes.some(function (price) {
                return !Number.isFinite(price) || price <= 0;
            })
        ) {
            throw new Error("K线收盘价包含无效数据。");
        }

        const signals = [];

        if (strategy === "ma") {
            const shortMA = movingAverage(closes, 7);
            const longMA = movingAverage(closes, 21);

            for (let i = 1; i < candles.length; i++) {
                if (
                    shortMA[i - 1] === null ||
                    longMA[i - 1] === null ||
                    shortMA[i] === null ||
                    longMA[i] === null
                ) {
                    continue;
                }

                if (
                    shortMA[i - 1] <= longMA[i - 1] &&
                    shortMA[i] > longMA[i]
                ) {
                    signals.push({
                        index: i,
                        type: "buy"
                    });
                } else if (
                    shortMA[i - 1] >= longMA[i - 1] &&
                    shortMA[i] < longMA[i]
                ) {
                    signals.push({
                        index: i,
                        type: "sell"
                    });
                }
            }
        } else if (strategy === "momentum") {
            const lookback = 5;

            for (let i = lookback; i < candles.length; i++) {
                const previous = closes[i - lookback];
                const current = closes[i];

                const momentum = (current - previous) / previous;

                if (momentum > 0.025) {
                    signals.push({
                        index: i,
                        type: "buy"
                    });
                } else if (momentum < -0.025) {
                    signals.push({
                        index: i,
                        type: "sell"
                    });
                }
            }
        } else {
            throw new Error("不支持的交易策略：" + strategy);
        }

        return signals;
    }

    /**
     * 对外提供统一接口。
     */
    window.TradingStrategies = {
        movingAverage: movingAverage,
        getSignals: getSignals
    };
})();