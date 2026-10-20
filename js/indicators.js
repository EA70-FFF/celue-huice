(function () {
    "use strict";

    /**
     * 指标计算模块
     *
     * 负责：
     * 1. 计算总收益率
     * 2. 计算最大回撤
     * 3. 统计盈利、亏损和胜率
     * 4. 计算买入与卖出手续费
     *
     * 注意：本模块只负责计算，不操作网页元素。
     */

    /**
     * 计算总收益率。
     *
     * @param {number} initialCapital 初始资金
     * @param {number} finalCapital 最终资金
     * @returns {number} 收益率，单位为百分比
     */
    function calculateTotalReturn(initialCapital, finalCapital) {
        if (
            !Number.isFinite(initialCapital) ||
            !Number.isFinite(finalCapital) ||
            initialCapital <= 0
        ) {
            return 0;
        }

        return ((finalCapital - initialCapital) / initialCapital) * 100;
    }

    /**
     * 根据资金曲线计算最大回撤。
     *
     * @param {number[]} equityCurve 资金曲线数组
     * @param {number} initialCapital 初始资金
     * @returns {number} 最大回撤，单位为百分比
     */
    function calculateMaxDrawdown(equityCurve, initialCapital) {
        if (!Array.isArray(equityCurve)) {
            return 0;
        }

        let peak = Number.isFinite(initialCapital) && initialCapital > 0
            ? initialCapital
            : 0;

        let maxDrawdown = 0;

        for (const equity of equityCurve) {
            if (!Number.isFinite(equity)) {
                continue;
            }

            peak = Math.max(peak, equity);

            if (peak > 0) {
                const drawdown = ((peak - equity) / peak) * 100;

                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        return maxDrawdown;
    }

    /**
     * 统计已完成交易。
     *
     * @param {Array<Object>} trades 交易记录
     * @returns {Object} 交易统计结果
     */
    function calculateTradeStats(trades) {
        if (!Array.isArray(trades)) {
            trades = [];
        }

        let wins = 0;
        let losses = 0;
        let breakeven = 0;

        for (const trade of trades) {
            if (!trade || !Number.isFinite(trade.profit)) {
                continue;
            }

            if (trade.profit > 0) {
                wins++;
            } else if (trade.profit < 0) {
                losses++;
            } else {
                breakeven++;
            }
        }

        const totalTrades = wins + losses + breakeven;

        const winRate = totalTrades > 0
            ? (wins / totalTrades) * 100
            : 0;

        return {
            totalTrades: totalTrades,
            wins: wins,
            losses: losses,
            breakeven: breakeven,
            winRate: winRate
        };
    }

    /**
     * 计算单次交易手续费。
     *
     * @param {number} tradeValue 交易金额
     * @param {number} feeRate 手续费比例，例如 0.001 代表 0.1%
     * @returns {number} 手续费金额
     */
    function calculateFee(tradeValue, feeRate) {
        if (
            !Number.isFinite(tradeValue) ||
            !Number.isFinite(feeRate) ||
            tradeValue < 0 ||
            feeRate < 0
        ) {
            return 0;
        }

        return tradeValue * feeRate;
    }

    /**
     * 对外提供统一接口。
     */
    window.BacktestIndicators = {
        calculateTotalReturn: calculateTotalReturn,
        calculateMaxDrawdown: calculateMaxDrawdown,
        calculateTradeStats: calculateTradeStats,
        calculateFee: calculateFee
    };
})();