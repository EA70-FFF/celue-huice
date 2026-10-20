(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let candles = [];
  let chartReady = false;

  function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";

    return number.toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatMoney(value) {
    return "$" + formatNumber(value, 2);
  }

  function formatPercent(value) {
    return formatNumber(value, 2) + "%";
  }

  function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setMetricColor(id, value) {
    const element = $(id);
    if (!element) return;

    element.classList.remove("positive", "negative");

    if (value > 0) {
      element.classList.add("positive");
    } else if (value < 0) {
      element.classList.add("negative");
    }
  }

  function getSelectedSymbol() {
    return $("symbol")?.value || "BTCUSDT";
  }

  function getSelectedTimeframe() {
    return $("timeframe")?.value || "1D";
  }

  function getSelectedStrategy() {
    return $("strategy")?.value || "ma";
  }

  function generateMarketData() {
    if (!window.MarketData ||
        typeof window.MarketData.generateCandles !== "function") {
      throw new Error("行情模块未加载，请检查 js/market-data.js");
    }

    candles = window.MarketData.generateCandles(
      getSelectedSymbol(),
      getSelectedTimeframe()
    );

    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error("没有生成行情数据，请检查行情模块。");
    }

    if (window.ChartManager) {
      if (!chartReady) {
        window.ChartManager.initChart("chart");
        chartReady = true;
      }

      window.ChartManager.setCandles(candles);
      window.ChartManager.clearMarkers();
      window.ChartManager.fitContent();
    }

    updateMarketHeader();
  }

  function updateMarketHeader() {
    const symbol = getSelectedSymbol();
    const last = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    setText("chartSymbol", symbol);

    if (!last) return;

    setText("currentPrice", formatMoney(last.close));

    const change = previous && previous.close !== 0
      ? ((last.close - previous.close) / previous.close) * 100
      : 0;

    const priceChange = $("priceChange");

    if (priceChange) {
      priceChange.textContent =
        (change > 0 ? "+" : "") + formatPercent(change);

      priceChange.classList.remove("positive", "negative");

      if (change > 0) {
        priceChange.classList.add("positive");
      } else if (change < 0) {
        priceChange.classList.add("negative");
      }
    }
  }

  function renderResults(result) {
    setText("totalReturn", formatPercent(result.totalReturn));
    setText("finalCapital", formatMoney(result.finalCapital));
    setText("maxDrawdown", formatPercent(result.maxDrawdown));
    setText("tradeCount", String(result.tradeCount));
    setText("winRate", formatPercent(result.winRate));
    setText("winCount", String(result.wins));
    setText("lossCount", String(result.losses));
    setText("totalFees", formatMoney(result.totalFees));

    setMetricColor("totalReturn", result.totalReturn);

    const drawdown = $("maxDrawdown");
    if (drawdown) {
      drawdown.classList.remove("positive", "negative");

      if (result.maxDrawdown > 0) {
        drawdown.classList.add("negative");
      }
    }

    setText(
      "resultStatus",
      result.tradeCount > 0 ? "回测完成" : "回测完成，暂无交易"
    );

    renderTradeTable(result.trades || []);

    if (window.ChartManager) {
      window.ChartManager.setMarkers(result.markers || []);
    }
  }

  function renderTradeTable(trades) {
    const tbody = $("tradeTableBody");
    if (!tbody) return;

    tbody.replaceChildren();

    setText("tradeSummary", `共 ${trades.length} 笔交易`);

    if (trades.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 7;
      cell.className = "empty-state";
      cell.textContent = "当前参数下没有产生交易信号。";

      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    trades.slice().reverse().forEach((trade, index) => {
      const row = document.createElement("tr");

      const entryTime = trade.entryTime ?? trade.entryTimestamp;
      const exitTime = trade.exitTime ?? trade.exitTimestamp;

      const values = [
        String(trades.length - index),
        trade.side === "short" ? "做空" : "做多",
        Number.isFinite(entryTime) ? formatDate(entryTime) : "--",
        Number.isFinite(exitTime) ? formatDate(exitTime) : "--",
        formatMoney(trade.entryPrice),
        formatMoney(trade.exitPrice),
        formatMoney(trade.profit)
      ];

      values.forEach((value, cellIndex) => {
        const cell = document.createElement("td");
        cell.textContent = value;

        if (cellIndex === 1) {
          const tag = document.createElement("span");
          tag.className =
            "tag " + (trade.side === "short" ? "tag-sell" : "tag-buy");
          tag.textContent = value;
          cell.textContent = "";
          cell.appendChild(tag);
        }

        if (cellIndex === 6) {
          cell.classList.add(
            trade.profit > 0 ? "positive" :
            trade.profit < 0 ? "negative" : ""
          );
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  }

  function runBacktest() {
    try {
      if (!window.BacktestEngine ||
          typeof window.BacktestEngine.runBacktest !== "function") {
        throw new Error("回测模块未加载，请检查 js/backtest.js");
      }

      if (!candles.length) {
        generateMarketData();
      }

      const initialCapital = Number($("initialCapital")?.value || 10000);
      const feePercent = Number($("fee")?.value || 0);
      const strategy = getSelectedStrategy();

      if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
        throw new Error("初始资金必须大于 0。");
      }

      if (!Number.isFinite(feePercent) || feePercent < 0) {
        throw new Error("手续费不能小于 0。");
      }

      const result = window.BacktestEngine.runBacktest({
        candles,
        initialCapital,
        feePercent,
        strategy
      });

      renderResults(result);
    } catch (error) {
      console.error("回测失败：", error);
      setText("resultStatus", error.message || "回测失败，请检查代码。");
    }
  }

  function resetBacktest() {
    try {
      generateMarketData();

      setText("totalReturn", "--");
      setText("finalCapital", "--");
      setText("maxDrawdown", "--");
      setText("tradeCount", "0");
      setText("winRate", "--");
      setText("winCount", "0");
      setText("lossCount", "0");
      setText("totalFees", "--");
      setText("resultStatus", "等待回测");

      const tbody = $("tradeTableBody");
      if (tbody) {
        tbody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "empty-state";
        cell.textContent = "点击“运行回测”查看交易记录。";

        row.appendChild(cell);
        tbody.appendChild(row);
      }

      setText("tradeSummary", "暂无交易记录");
    } catch (error) {
      console.error("重置失败：", error);
      setText("resultStatus", error.message || "重置失败。");
    }
  }

  function bindEvents() {
    $("runButton")?.addEventListener("click", runBacktest);
    $("resetButton")?.addEventListener("click", resetBacktest);

    ["symbol", "timeframe"].forEach((id) => {
      $(id)?.addEventListener("change", () => {
        try {
          generateMarketData();
          resetBacktest();
        } catch (error) {
          console.error(error);
          setText("resultStatus", error.message || "行情加载失败。");
        }
      });
    });
  }

  function init() {
    bindEvents();

    try {
      generateMarketData();
      setText("resultStatus", "等待回测");
    } catch (error) {
      console.error("初始化失败：", error);
      setText("resultStatus", error.message || "初始化失败，请检查模块文件。");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();