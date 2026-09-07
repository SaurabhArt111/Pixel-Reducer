/**
 * A simple FIFO queue that runs at most `concurrency` async tasks at once.
 * Used to bound how many image decodes happen simultaneously when many
 * queue rows scroll into view at once - without this, a fast scroll or
 * scrollbar drag could kick off dozens of decodes in the same tick.
 */
export function createTaskQueue(concurrency = 4) {
  const pending = [];
  let active = 0;

  function runNext() {
    if (active >= concurrency || pending.length === 0) return;
    const { task, resolve, reject } = pending.shift();
    active += 1;
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        runNext();
      });
  }

  return function enqueue(task) {
    return new Promise((resolve, reject) => {
      pending.push({ task, resolve, reject });
      runNext();
    });
  };
}
