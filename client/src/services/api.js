const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response (rare) - fall through with null body
  }

  if (!res.ok) {
    const message = body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body;
}

/**
 * Upload a batch of files. `entries` is an array of { file, relativePath }
 * (see utils/fileTree.js) so folder structure and drag-and-drop paths are
 * preserved regardless of how the files were selected.
 */
async function uploadFiles(entries, inputType, onProgress) {
  const formData = new FormData();
  formData.append('inputType', inputType);

  // Sent before the file parts so the server can parse it first and match
  // each file to its folder path by upload order (see middleware/upload.js) -
  // multipart parsers strip slashes out of individual file "filename"s.
  const relativePaths = entries.map(({ file, relativePath }) => relativePath || file.name);
  formData.append('relativePaths', JSON.stringify(relativePaths));

  for (const { file, relativePath } of entries) {
    formData.append('files', file, relativePath || file.name);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/resize/upload`);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore parse error, handled below via status check
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new ApiError(body?.message || 'Upload failed.', xhr.status, body));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network error during upload.', 0));
    xhr.send(formData);
  });
}

async function processJob(jobId, options) {
  const res = await fetch(`${API_URL}/resize/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, ...options })
  });
  return parseResponse(res);
}

async function getStatus(jobId) {
  const res = await fetch(`${API_URL}/resize/status/${jobId}`);
  return parseResponse(res);
}

async function getJob(jobId) {
  const res = await fetch(`${API_URL}/resize/${jobId}`);
  return parseResponse(res);
}

function getDownloadUrl(jobId, type = 'zip') {
  return `${API_URL}/resize/download/${jobId}?type=${type}`;
}

async function getHistory({ search = '', status = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ search, status, page, limit });
  const res = await fetch(`${API_URL}/resize/history?${params.toString()}`);
  return parseResponse(res);
}

async function deleteJob(jobId) {
  const res = await fetch(`${API_URL}/resize/${jobId}`, { method: 'DELETE' });
  return parseResponse(res);
}

async function getStorageJobs() {
  const res = await fetch(`${API_URL}/storage/jobs`);
  return parseResponse(res);
}

export default {
  uploadFiles,
  processJob,
  getStatus,
  getJob,
  getDownloadUrl,
  getHistory,
  deleteJob,
  getStorageJobs,
  ApiError
};
