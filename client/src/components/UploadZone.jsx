import { useRef, useState } from 'react';
import Button from './Button';
import { Spinner } from './Spinner';
import { entriesFromDataTransfer, entriesFromFileList } from '../utils/fileTree';

const SUPPORTED = ['JPG', 'JPEG', 'PNG', 'WEBP', 'TIFF', 'TIF'];

export default function UploadZone({ onFilesReady, uploading, uploadProgress }) {
  const [dragging, setDragging] = useState(false);
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  function classify(entries) {
    const zip = entries.find((e) => /\.zip$/i.test(e.file.name));
    if (entries.length === 1 && zip) return 'zip';
    const hasNested = entries.some((e) => e.relativePath.includes('/'));
    if (hasNested) return 'folder';
    if (entries.length === 1) return 'single';
    return 'multiple';
  }

  function submit(entries) {
    if (!entries || entries.length === 0) return;
    onFilesReady(entries, classify(entries));
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const entries = await entriesFromDataTransfer(e.dataTransfer);
    submit(entries);
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {uploading ? (
        <>
          <div className="dropzone-icon">
            <Spinner size="lg" />
          </div>
          <h2>Reading your files…</h2>
          <p className="sub">Scanning images and measuring dimensions</p>
          <div className="upload-progress-bar">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dropzone-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 3v12m0-12 4.5 4.5M12 3 7.5 7.5M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>Image Pixel Reducer</h2>
          <p className="sub">Drop images, folders or ZIP files here</p>
          <div className="dropzone-actions">
            <Button variant="primary" onClick={() => filesInputRef.current.click()}>
              Select Files
            </Button>
            <Button variant="secondary" onClick={() => folderInputRef.current.click()}>
              Select Folder
            </Button>
            <Button variant="secondary" onClick={() => zipInputRef.current.click()}>
              Select ZIP
            </Button>
          </div>
          <div className="format-tags">
            {SUPPORTED.map((f) => (
              <span className="format-tag" key={f}>
                {f}
              </span>
            ))}
          </div>
        </>
      )}

      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tiff,.tif"
        className="visually-hidden"
        onChange={(e) => {
          submit(entriesFromFileList(e.target.files));
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        className="visually-hidden"
        onChange={(e) => {
          submit(entriesFromFileList(e.target.files));
          e.target.value = '';
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="visually-hidden"
        onChange={(e) => {
          submit(entriesFromFileList(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}
