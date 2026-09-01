export const Q96 = 2n ** 96n;

export function tickToSqrtPriceX96(tick) {
  const price = Math.pow(1.0001, Number(tick));
  const sqrtP = Math.sqrt(price);
  return BigInt(Math.floor(sqrtP * Number(Q96)));
}

export function sqrtPriceX96ToTick(sqrtPriceX96) {
  const sqrtP = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtP * sqrtP;
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

export function alignTick(tick, tickSpacing) {
  const ts = Number(tickSpacing);
  let t = Math.floor(Number(tick) / ts) * ts;
  return t;
}

export function priceToTick(price, dec0, dec1, tickSpacing) {
  const adjusted = price * Math.pow(10, dec0 - dec1);
  const rawTick = Math.floor(Math.log(adjusted) / Math.log(1.0001));
  return alignTick(rawTick, tickSpacing);
}

export function tickToPrice(tick, dec0, dec1) {
  const rawPrice = Math.pow(1.0001, Number(tick));
  return rawPrice * Math.pow(10, dec1 - dec0);
}

export function computeBand(currentTick, tickSpacing, widthPct = 0.15) {
  const ts = Number(tickSpacing);
  const tickRange = Math.round(Math.log(1 + widthPct) / Math.log(1.0001));
  const tickLower = alignTick(currentTick - tickRange, ts);
  const tickUpper = alignTick(currentTick + tickRange, ts);
  return { tickLower, tickUpper };
}

export function getLiquidityForAmounts(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, amount0, amount1) {
  let [sqrtA, sqrtB] = sqrtRatioAX96 <= sqrtRatioBX96 ? [sqrtRatioAX96, sqrtRatioBX96] : [sqrtRatioBX96, sqrtRatioAX96];

  if (sqrtRatioX96 <= sqrtA) {
    return (amount0 * sqrtA * sqrtB) / ((sqrtB - sqrtA) * Q96);
  } else if (sqrtRatioX96 < sqrtB) {
    const liq0 = (amount0 * sqrtRatioX96 * sqrtB) / ((sqrtB - sqrtRatioX96) * Q96);
    const liq1 = (amount1 * Q96) / (sqrtRatioX96 - sqrtA);
    return liq0 < liq1 ? liq0 : liq1;
  } else {
    return (amount1 * Q96) / (sqrtB - sqrtA);
  }
}
