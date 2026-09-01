import fs from 'fs';
import path from 'path';
import os from 'os';
import { strip0x, pad32, addrWord, multicall } from './chain.mjs';
import { SEL, VOTER, FACTORY_V2, FACTORY_CL, NPM_CL } from './markets.mjs';

const STATE_DIR = path.join(os.homedir(), '.aerodrome-lp');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

export function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { positions: {} };
}

export function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {}
}

export async function getPoolInfo(poolAddr, type = 'cl') {
  if (type === 'basic') {
    const calls = [
      { target: poolAddr, data: '0x' + SEL.token0, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.token1, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.stable, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.getReserves, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.totalSupply, allowFailure: false },
      { target: VOTER, data: '0x' + SEL.gauges + addrWord(poolAddr), allowFailure: true },
    ];
    const res = await multicall(calls);
    const token0 = '0x' + res[0].returnData.slice(26, 66);
    const token1 = '0x' + res[1].returnData.slice(26, 66);
    const stable = BigInt(res[2].returnData) !== 0n;
    const rData = strip0x(res[3].returnData);
    const reserve0 = BigInt('0x' + rData.slice(0, 64));
    const reserve1 = BigInt('0x' + rData.slice(64, 128));
    const totalSupply = BigInt(res[4].returnData);
    const gauge = res[5].success && res[5].returnData.length >= 66 ? '0x' + res[5].returnData.slice(26, 66) : null;

    return { type: 'basic', pool: poolAddr, token0, token1, stable, reserve0, reserve1, totalSupply, gauge };
  } else {
    const calls = [
      { target: poolAddr, data: '0x' + SEL.token0, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.token1, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.tickSpacing, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.slot0, allowFailure: false },
      { target: poolAddr, data: '0x' + SEL.liquidity, allowFailure: false },
      { target: VOTER, data: '0x' + SEL.gauges + addrWord(poolAddr), allowFailure: true },
    ];
    const res = await multicall(calls);
    const token0 = '0x' + res[0].returnData.slice(26, 66);
    const token1 = '0x' + res[1].returnData.slice(26, 66);
    const tickSpacing = Number(BigInt(res[2].returnData));
    const s0 = strip0x(res[3].returnData);
    const sqrtPriceX96 = BigInt('0x' + s0.slice(0, 64));
    let rawTick = Number(BigInt('0x' + s0.slice(64, 128)));
    if (rawTick >= 0x80000000) rawTick -= 0x100000000;
    const tick = rawTick;
    const liquidity = BigInt(res[4].returnData);
    const gauge = res[5].success && res[5].returnData.length >= 66 ? '0x' + res[5].returnData.slice(26, 66) : null;

    return { type: 'cl', pool: poolAddr, token0, token1, tickSpacing, sqrtPriceX96, tick, liquidity, gauge };
  }
}
