import app from '../lib/app.js';

export default async function handler(req, res) {
  // Set the path for routing
  req.url = req.url.replace(/^\/api/, '') || '/';
  
  return app(req, res);
}