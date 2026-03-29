import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { checkWorkerStatus } from '../services/doubaoApi';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket() {
  const { settings } = useSettingsStore();
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    const check = async () => {
      const connected = await checkWorkerStatus(settings.websocketUrl);
      setStatus(connected ? 'connected' : 'disconnected');
    };

    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [settings.websocketUrl]);

  return { status };
}
