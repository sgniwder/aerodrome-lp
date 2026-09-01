import { MULTICALL3 } from './markets.mjs';

const RPC_URLS = [
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
];

export async function rpcCall(method, params, rpcIdx = 0) {
  const url = RPC_URLS[rpcIdx % RPC_URLS.length];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
    return json.result;
  } catch (err) {
    if (rpcIdx < RPC_URLS.length - 1) {
      return rpcCall(method, params, rpcIdx + 1);
    }
    throw err;
  }
}

export function strip0x(h) {
  if (!h) return '';
  return h.startsWith('0x') || h.startsWith('0X') ? h.slice(2) : h;
}

export function pad32(hexStr) {
  const s = strip0x(hexStr);
  return '0'.repeat(Math.max(0, 64 - s.length)) + s;
}

export function addrWord(addr) {
  return pad32(addr.toLowerCase());
}

export function uintWord(val) {
  const bn = typeof val === 'bigint' ? val : BigInt(val);
  return pad32(bn.toString(16));
}

export function intWord(val) {
  let bn = typeof val === 'bigint' ? val : BigInt(val);
  if (bn < 0n) {
    bn = (1n << 256n) + bn;
  }
  return pad32(bn.toString(16));
}

export async function multicall(calls) {
  const tupleCount = calls.length;
  let header = '82ad56cb';
  let offsets = [];
  let dynamicBlocks = [];

  let currentOffset = tupleCount * 32;

  for (let i = 0; i < tupleCount; i++) {
    offsets.push(uintWord(currentOffset));
    const c = calls[i];
    const target = addrWord(c.target);
    const allowFail = pad32(c.allowFailure ? '1' : '0');
    const cdata = strip0x(c.data);
    const dataLen = cdata.length / 2;
    const dataOffset = uintWord(32 * 3);
    const dataLenWord = uintWord(dataLen);
    const paddedData = cdata + '0'.repeat((64 - (cdata.length % 64)) % 64);

    const block = target + allowFail + dataOffset + dataLenWord + paddedData;
    dynamicBlocks.push(block);
    currentOffset += block.length / 2;
  }

  const calldata = '0x' + header + uintWord(32) + uintWord(tupleCount) + offsets.join('') + dynamicBlocks.join('');
  const resultHex = await rpcCall('eth_call', [{ to: MULTICALL3, data: calldata }, 'latest']);

  const hex = strip0x(resultHex);
  const count = Number(BigInt('0x' + hex.slice(64, 128)));
  const results = [];

  for (let i = 0; i < count; i++) {
    const tupleOffset = Number(BigInt('0x' + hex.slice(128 + i * 64, 128 + (i + 1) * 64))) * 2;
    const itemHex = hex.slice(64 + tupleOffset);
    const success = BigInt('0x' + itemHex.slice(0, 64)) !== 0n;
    const returnDataLen = Number(BigInt('0x' + itemHex.slice(128, 192))) * 2;
    const returnData = itemHex.slice(192, 192 + returnDataLen);
    results.push({ success, returnData: '0x' + returnData });
  }

  return results;
}
