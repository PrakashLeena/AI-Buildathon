import { applyCors } from '../../lib/cors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  res.status(200).json({ status: 'ok', service: 'ai-buildathon-backend', time: new Date().toISOString() });
}
