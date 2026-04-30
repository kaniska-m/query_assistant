import { useState } from 'react';
import { api } from '../api/api';

export function useQueryExecution(onAddHistory) {
  const [result, setResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (sql) => {
    if (!sql?.trim()) return;
    setExecuting(true);
    setError(null);
    try {
      const res = await api.executeSQL(sql);
      setResult(res);
      onAddHistory?.({
        sql,
        timestamp: new Date().toISOString(),
        execTime: res.execution_time,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { result, executing, error, execute, reset };
}
