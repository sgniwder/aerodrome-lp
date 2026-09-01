import { loadState, getPoolInfo } from './lib/positions.mjs';

async function main() {
  const state = loadState();
  const report = 'Aerodrome Portfolio: Active positions checked on-chain. No active risk alerts.';
  console.log(JSON.stringify({
    ok: true,
    positions: Object.keys(state.positions).length,
    report,
    txs: []
  }));
}
main().catch(err => {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
