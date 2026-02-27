import { runCommand } from "./run-command";

export const getGoldQuote = () => {
  try {
    const raw = runCommand("curl -s 'https://stooq.com/q/l/?s=xauusd'").trim();
    const [symbol, date, time, open, high, low, close] = raw.split(",");
    return {
      symbol,
      date,
      time,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close)
    };
  } catch (error) {
    console.error("Mission Control: gold quote fetch failed", error);
    return undefined;
  }
};
