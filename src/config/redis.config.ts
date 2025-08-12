import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Cache for URL lookups
  cache: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
  },

  // Analytics (rate limiting, click buffers)
  analytics: {
    url: process.env.REDIS_ANALYTICS_URL,
    host: process.env.REDIS_ANALYTICS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_ANALYTICS_PORT || '6380', 10),
    db: parseInt(process.env.REDIS_ANALYTICS_DB || '0', 10),
    username: process.env.REDIS_ANALYTICS_USERNAME,
    password: process.env.REDIS_ANALYTICS_PASSWORD,
    tls: process.env.REDIS_ANALYTICS_TLS === 'true',
  },

  ttl: {},
}));
