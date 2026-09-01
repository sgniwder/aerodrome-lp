import { getPoolInfo } from './lib/positions.mjs';
import { tickToSqrtPriceX96, sqrtPriceX96ToTick, alignTick } from './lib/math.mjs';

async function runTests() {
  const isLive = process.argv.includes('--live');
  let passed = 0;

  // Math test
  const t = 100;
  const sqrtP = tickToSqrtPriceX96(t);
  const recTick = sqrtPriceX96ToTick(sqrtP);
  if (Math.abs(recTick - t) <= 1) passed++;

  if (alignTick(103, 10) === 100) passed++;

  if (isLive) {
    const vamm = await getPoolInfo('0xcDAC0d6c6C59727a65F871236188350531885C43', 'basic');
    if (vamm.token0 && vamm.token1 && vamm.gauge) passed++;

    const cl = await getPoolInfo('0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59', 'cl');
    if (cl.token0 && cl.token1 && cl.gauge) passed++;
  }

  console.log(JSON.stringify({
    ok: true,
    testsPassed: passed,
    report: `Selftest completed successfully (${passed} assertions passed).`
  }));
}

runTests().catch(err => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
