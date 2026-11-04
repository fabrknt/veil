// Split a 32-byte secret into 5 shares so any 3 rebuild it. No Solana, no network.
// Run: npx tsx examples/shamir-quickstart.ts
import { splitSecret, combineShares } from '@fabrknt/veil-core/shamir';

const secret = new Uint8Array(32).map((_, i) => i + 1);
const shares = splitSecret(secret, 3, 5);
console.log(`split into ${shares.length} shares, any 3 rebuild it`);

const same = (a: Uint8Array, b: Uint8Array) => a.every((x, i) => x === b[i]);
console.log(`shares 1,3,5 rebuild it: ${same(combineShares([shares[0], shares[2], shares[4]]), secret)}`);
console.log(`shares 2,3,4 rebuild it: ${same(combineShares([shares[1], shares[2], shares[3]]), secret)}`);
console.log(`shares 1,2 only:          ${same(combineShares([shares[0], shares[1]]), secret)}`);
