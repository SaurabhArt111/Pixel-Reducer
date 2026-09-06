import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const POLL_INTERVAL_MS = 700;

/**
 * Polls GET /api/resize/status/:jobId while `active` is true, stopping
 * automatically once the job reaches a terminal state (completed/failed).
 */
export function useJobProgress(jobId, active) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId || !active) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const data = await api.getStatus(jobId);
        if (cancelled) return;
        setJob(data.job);
        setError(null);

        if (data.job.status === 'processing' || data.job.status === 'uploaded') {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId, active]);

  return { job, error };
}
