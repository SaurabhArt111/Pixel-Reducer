/**
 * Run `worker` over `items` with at most `concurrency` in flight at once.
 * Keeps memory/CPU bounded for large batches instead of firing every
 * image at Sharp simultaneously.
 */
async function asyncPool(concurrency, items, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    const current = cursor++;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await runNext();
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, runNext);
  await Promise.all(runners);
  return results;
}

module.exports = asyncPool;
