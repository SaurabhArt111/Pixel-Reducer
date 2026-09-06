import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { useJob } from '../context/JobContext';
import api from '../services/api';

export default function CompletionModal() {
  const { modalOpen, dismissModal, job, jobId, uploadResult, handleReset } = useJob();
  const navigate = useNavigate();

  if (!modalOpen || !job) return null;

  const isSingle = uploadResult?.inputType === 'single' && job.singleImageName;

  function goToResults() {
    dismissModal();
    navigate('/');
  }

  return (
    <div className="modal-backdrop" onClick={dismissModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={dismissModal} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="result-check">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2>Processing complete</h2>
        <p className="sub">
          {job.processed} image{job.processed === 1 ? '' : 's'} processed
          {job.failed > 0 ? `, ${job.failed} failed` : ''} · saved {job.savedLabel}
        </p>

        <div className="result-actions" style={{ marginTop: 24 }}>
          {isSingle && (
            <Button variant="primary" onClick={() => window.open(api.getDownloadUrl(jobId, 'image'), '_blank')}>
              Download Image
            </Button>
          )}
          <Button
            variant={isSingle ? 'secondary' : 'primary'}
            onClick={() => window.open(api.getDownloadUrl(jobId, 'zip'), '_blank')}
          >
            Download ZIP
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Start new batch
          </Button>
        </div>

        <button className="modal-link" onClick={goToResults}>
          View full results
        </button>
      </div>
    </div>
  );
}
