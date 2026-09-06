/**
 * Read a single FileSystemEntry (file or directory) recursively, resolving
 * to a flat list of { file, relativePath }. Directories are walked using
 * the (non-standard but universally supported in Chromium/WebKit)
 * webkitGetAsEntry API so folder drag-and-drop preserves structure the
 * same way an <input webkitdirectory> selection does.
 */
function readEntry(entry, prefix) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file(
        (file) => resolve([{ file, relativePath: `${prefix}${entry.name}` }]),
        () => resolve([])
      );
      return;
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      const all = [];

      const readBatch = () => {
        reader.readEntries(async (batch) => {
          if (batch.length === 0) {
            const nested = await Promise.all(all);
            resolve(nested.flat());
            return;
          }
          for (const child of batch) {
            all.push(readEntry(child, `${prefix}${entry.name}/`));
          }
          readBatch(); // readEntries must be called repeatedly until it returns an empty array
        }, () => resolve([]));
      };

      readBatch();
      return;
    }

    resolve([]);
  });
}

/**
 * Normalize a DataTransferItemList from a drop event into
 * { file, relativePath }[]. Falls back to flat files (no recursion)
 * in browsers without the entry API.
 */
export async function entriesFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items ? Array.from(dataTransfer.items) : null;

  if (!items || !items[0]?.webkitGetAsEntry) {
    return Array.from(dataTransfer.files).map((file) => ({ file, relativePath: file.name }));
  }

  const topEntries = items.map((item) => item.webkitGetAsEntry()).filter(Boolean);
  const results = await Promise.all(topEntries.map((entry) => readEntry(entry, '')));
  return results.flat();
}

/** Normalize a plain FileList (from an <input>) into { file, relativePath }[]. */
export function entriesFromFileList(fileList) {
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: file.webkitRelativePath && file.webkitRelativePath.length > 0
      ? file.webkitRelativePath
      : file.name
  }));
}
