
import React, { useEffect } from 'react';
import { CheckIcon, XIcon } from './icons';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationProps {
  notification: NotificationMessage | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const bgColor = 
    notification.type === 'success' ? 'bg-green-600' : 
    notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] animate-fadeIn">
      <div className={`${bgColor} text-white px-6 py-3 rounded shadow-2xl flex items-center space-x-3`}>
        {notification.type === 'success' && <CheckIcon />}
        {notification.type === 'error' && <div className="h-5 w-5 flex items-center justify-center font-bold border border-white rounded-full">!</div>}
        <span className="font-medium">{notification.message}</span>
        <button onClick={onClose} className="ml-4 opacity-80 hover:opacity-100">
          <XIcon />
        </button>
      </div>
    </div>
  );
};

export default Notification;
