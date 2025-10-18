import { auth } from '../config/firebase.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - لا يوجد توكن'
      });
    }

    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'توكن غير صالح'
    });
  }
};

// Rate limiting per user
const requestCounts = new Map();

export const rateLimit = (req, res, next) => {
  const userId = req.userId;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 10;

  if (!requestCounts.has(userId)) {
    requestCounts.set(userId, []);
  }

  const userRequests = requestCounts.get(userId);
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'تم تجاوز عدد الطلبات المسموح. حاول مرة أخرى لاحقاً'
    });
  }

  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);
  
  next();
};