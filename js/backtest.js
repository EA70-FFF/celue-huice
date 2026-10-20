(function () {
    "use strict";

    /**
     * 回测引擎
     *
     * 负责：
     * 1. 根据策略信号执行模拟买卖
     * 2. 计算买卖手续费
     * 3. 记录已完成交易
     * 4. 计算资金曲线和回测指标
     *
     * 当前只支持示例行情，不连接真实交易所。
     */

    /**
     * 执行一次回测。
     *
     * @param {Object} options 回测参数
     * @param {Array<Object>} options.candles K线数据
     * @param {number} options.initialCapital 初始资金
     * @param {number} options.feePercent 单边手续费百分比，例如0.1表示0.1%
     * @param {string} options.strategy 策略名称：ma 或 momentum
     * @returns {Object} 回测结果
     */
    function runBacktest(options) {
        if (!options || !Array.isArray(options.candles)) {
            throw new Error("缺少有效的K线数据。");
        }

        const candles = options.candles;
        const initialCapital = Number(options.initialCapital);
        const feePercent = Number(options.feePercent);
        const strategy = options.strategy;

        if (candles.length < 2) {
            throw new Error("K线数量不足，无法进行回测。");
        }

        if (
            !Number.isFinite(initialCapital) ||
            initialCapital <= 0
        ) {
            throw new Error("初始资金必须大于零。");
        }

        if (
            !Number.isFinite(feePercent) ||
            feePercent < 0 ||
            feePercent > 10
        ) {
            throw new Error("手续费必须在0%到10%之间。");
        }

        for (const candle of candles) {
            if (
                !candle ||
                !Number.isFinite(candle.time) ||
                !Number.isFinite(candle.open) ||
                !Number.isFinite(candle.high) ||
                !Number.isFinite(candle.low) ||
                !Number.isFinite(candle.close) ||
                candle.open <= 0 ||
                candle.close <= 0
            ) {
                throw new Error("K线数据包含无效数值。");
            }
        }

        if (!window.TradingStrategies) {
            throw new Error("交易策略模块尚未加载。");
        }

        if (!window.BacktestIndicators) {
            throw new Error("指标计算模块尚未加载。");
        }

        const feeRate = feePercent / 100;

        const signals = window.TradingStrategies.getSignals(
            candles,
            strategy
        );

        const signalMap = new Map();

        signals.forEach(function (signal) {
            if (!signalMap.has(signal.index)) {
                signalMap.set(signal.index, []);
            }

            signalMap.get(signal.index).push(signal);
        });

        let cash = initialCapital;
        let quantity = 0;

        let entryPrice = 0;
        let entryTime = null;
        let entryCost = 0;

        let totalFees = 0;

        const trades = [];
        const markers = [];
        const equityCurve = [initialCapital];

        let peakEquity = initialCapital;
        let maxDrawdown = 0;

        /**
         * 更新资金曲线和最大回撤。
         */
        function recordEquity(equity) {
            equityCurve.push(equity);

            peakEquity = Math.max(peakEquity, equity);

            if (peakEquity > 0) {
                const drawdown =
                    ((peakEquity - equity) / peakEquity) * 100;

                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        /**
         * 买入。
         */
        function buy(candle) {
            const executionPrice = candle.open;

            const buyQuantity =
                cash / (executionPrice * (1 + feeRate));

            if (!Number.isFinite(buyQuantity) || buyQuantity <= 0) {
                return;
            }

            quantity = buyQuantity;

            const buyValue = quantity * executionPrice;
            const buyFee = buyValue * feeRate;

            cash -= buyValue + buyFee;

            totalFees += buyFee;

            entryPrice = executionPrice;
            entryTime = candle.time;
            entryCost = buyValue + buyFee;

            markers.push({
                time: candle.time,
                position: "belowBar",
                color: "#0ecb81",
                shape: "arrowUp",
                text: "买入"
            });
        }

        /**
         * 卖出并记录交易。
         */
        function sell(candle, executionPrice, markerText) {
            if (quantity <= 0) {
                return;
            }

            const sellValue = quantity * executionPrice;
            const sellFee = sellValue * feeRate;
            const exitNetValue = sellValue - sellFee;

            cash += exitNetValue;
            totalFees += sellFee;

            const tradeProfit = exitNetValue - entryCost;

            const tradeReturn = entryCost > 0
                ? (tradeProfit / entryCost) * 100
                : 0;

            trades.push({
                entryTime: entryTime,
                exitTime: candle.time,
                entryPrice: entryPrice,
                exitPrice: executionPrice,
                profit: tradeProfit,
                returnPercent: tradeReturn
            });

            markers.push({
                time: candle.time,
                position: "aboveBar",
                color: "#f6465d",
                shape: "arrowDown",
                text: markerText || "卖出"
            });

            quantity = 0;
            entryPrice = 0;
            entryTime = null;
            entryCost = 0;
        }

        /*
         * 撮合规则：
         * 信号在第i根K线收盘后确认，
         * 在第i+1根K线开盘时执行。
         */
        for (let i = 1; i < candles.length; i++) {
            const candle = candles[i];
            const previousSignals = signalMap.get(i - 1) || [];

            for (const signal of previousSignals) {
                if (signal.type === "buy" && quantity === 0) {
                    buy(candle);
                } else if (
                    signal.type === "sell" &&
                    quantity > 0
                ) {
                    sell(candle, candle.open, "卖出");
                }
            }

            const equity = cash + quantity * candle.close;

            recordEquity(equity);
        }

        /*
         * 回测结束时，将未平仓持仓按最后一根K线收盘价平仓。
         */
        if (quantity > 0) {
            const lastCandle = candles[candles.length - 1];

            sell(lastCandle, lastCandle.close, "平仓");

            recordEquity(cash);
        }

        const finalCapital = cash;

        const totalReturn =
            window.BacktestIndicators.calculateTotalReturn(
                initialCapital,
                finalCapital
            );

        const tradeStats =
            window.BacktestIndicators.calculateTradeStats(trades);

        /*
         * 用统一的指标模块计算最大回撤。
         */
        maxDrawdown =
            window.BacktestIndicators.calculateMaxDrawdown(
                equityCurve,
                initialCapital
            );

        return {
            initialCapital: initialCapital,
            finalCapital: finalCapital,
            totalReturn: totalReturn,
            maxDrawdown: maxDrawdown,
            totalFees: totalFees,

            trades: trades,
            markers: markers,
            equityCurve: equityCurve,

            tradeCount: tradeStats.totalTrades,
            wins: tradeStats.wins,
            losses: tradeStats.losses,
            breakeven: tradeStats.breakeven,
            winRate: tradeStats.winRate
        };
    }

    /**
     * 暴露回测引擎接口。
     */
    window.BacktestEngine = {
        runBacktest: runBacktest
    };
})();