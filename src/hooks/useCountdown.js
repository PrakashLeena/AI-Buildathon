import { useEffect, useState } from 'react';
import { REGISTRATION_CUTOFF_DATE } from '../lib/registrationDeadline.js';

/**
 * Countdown timer hook - target deadline: August 15, 2026 07:00:00 local time.
 */
export default function useCountdown(targetDateString = REGISTRATION_CUTOFF_DATE) {
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00', closed: false });

  useEffect(() => {
    const targetDate = new Date(targetDateString).getTime();

    const update = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft((prev) => ({ ...prev, closed: true }));
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        closed: false
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDateString]);

  return timeLeft;
}
