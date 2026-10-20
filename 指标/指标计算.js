"use strict";

/**
 * 指标计算模块
 * 文件：指标/指标计算.js
 *
 * 当前提供：
 * 1. 总收益率
 * 2. 最大回撤
 * 3. 盈利交易比例
 * 4. 盈利次数
 * 5. 亏损次数
 * 6. 手续费统计辅助
 */

(function (global) {
    function 计算总收益率(初始资金, 最终资金) {
        if (
            !Number.isFinite(初始资金) ||
            !Number.isFinite(最终资金) ||
            初始资金 <= 0
        ) {
            return 0;
        }

        return ((最终资金 - 初始资金) / 初始资金) * 100;
    }

    function 计算最大回撤(资金曲线) {
        if (!Array.isArray(资金曲线) || 资金曲线.length === 0) {
            return 0;
        }

        let 历史最高资金 = 资金曲线[0];
        let 最大回撤 = 0;

        for (const 当前资金 of 资金曲线) {
            if (!Number.isFinite(当前资金)) {
                continue;
            }

            历史最高资金 = Math.max(历史最高资金, 当前资金);

            if (历史最高资金 > 0) {
                const 当前回撤 =
                    ((历史最高资金 - 当前资金) / 历史最高资金) * 100;

                最大回撤 = Math.max(最大回撤, 当前回撤);
            }
        }

        return 最大回撤;
    }

    function 统计交易结果(交易记录) {
        const 记录 = Array.isArray(交易记录) ? 交易记录 : [];

        let 盈利次数 = 0;
        let 亏损次数 = 0;
        let 总盈利金额 = 0;
        let 总亏损金额 = 0;

        for (const 交易 of 记录) {
            const 收益 = Number(交易.profit);

            if (!Number.isFinite(收益)) {
                continue;
            }

            if (收益 > 0) {
                盈利次数++;
                总盈利金额 += 收益;
            } else if (收益 < 0) {
                亏损次数++;
                总亏损金额 += Math.abs(收益);
            }
        }

        const 有效交易次数 = 盈利次数 + 亏损次数;

        const 盈利比例 =
            有效交易次数 > 0
                ? (盈利次数 / 有效交易次数) * 100
                : 0;

        return {
            交易次数: 有效交易次数,
            盈利次数,
            亏损次数,
            盈利比例,
            总盈利金额,
            总亏损金额
        };
    }

    function 计算手续费(手续费记录) {
        if (!Array.isArray(手续费记录)) {
            return 0;
        }

        return 手续费记录.reduce(function (总额, 金额) {
            const 数值 = Number(金额);

            return 总额 + (
                Number.isFinite(数值) && 数值 > 0
                    ? 数值
                    : 0
            );
        }, 0);
    }

    global.策略回测指标 = {
        计算总收益率,
        计算最大回撤,
        统计交易结果,
        计算手续费
    };
})(window);