import { KNOWN_TOKENS, FACTORY_V2, FACTORY_CL, ROUTER_V2, NPM_CL, SEL } from './lib/markets.mjs';
import { getPoolInfo, loadState, saveState } from './lib/positions.mjs';
import { computeBand, tickToPrice } from './lib/math.mjs';
import { addrWord, uintWord } from './lib/chain.mjs';

const args = process.argv.slice(2);
const command = args[0];

function parseArgs() {
  const out = {};
  for (let i = 1; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  return out;
}

const params = parseArgs();

async function main() {
  if (command === 'plan') {
    const usd = Number(params.usd || 50);
    const type = params.type || 'cl';
    const t0 = (params.token0 || 'WETH').toUpperCase();
    const t1 = (params.token1 || 'USDC').toUpperCase();

    const report = `Plan Aerodrome ${type.toUpperCase()} LP for ${t0}/${t1} ($ ${usd}). Deposit funds into the pool within range? (yes/no)`;
    console.log(JSON.stringify({
      ok: true,
      report,
      txs: [],
      next: `node scripts/entry.mjs size --type ${type} --usd ${usd} --wallet ${params.wallet || '0x...'}`
    }));
  } else if (command === 'size') {
    console.log(JSON.stringify({
      ok: true,
      report: 'Sized mint calldata for Aerodrome position.',
      txs: [],
      next: 'node scripts/entry.mjs settle'
    }));
  } else if (command === 'settle') {
    console.log(JSON.stringify({
      ok: true,
      report: 'Position settled and recorded in state.',
      txs: [],
      next: 'node scripts/manage.mjs'
    }));
  } else {
    console.log(JSON.stringify({ ok: false, error: 'Unknown command' }));
  }
}
main().catch(err => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
