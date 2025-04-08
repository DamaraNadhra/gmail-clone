import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useEmailSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    const socket = io();

    socket.on('sync-finished', (data) => {
      console.log('Sync finished for userId:', data.userId);
      // Trigger UI updates or refetch data here
      setSyncStatus(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return syncStatus;
};

export default useEmailSyncStatus;
