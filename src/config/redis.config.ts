import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Cache for URL lookups
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT!) || 6379,
    db: 0,
  },

  // In-Memory for Analytics
  analytics: {
    host: process.env.REDIS_ANALYTICS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_ANALYTICS_PORT!) || 6380,
    db: 0,
  },

  ttl: {
    urls: 3600, // 1 hour for URLs
    clicks: 86400, // 24 hours for click data
  },
}));
