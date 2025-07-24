import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  cache: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
  },
  analytics: {
    host: process.env.REDIS_ANALYTICS_HOST,
    port: parseInt(process.env.REDIS_ANALYTICS_PORT!),
  },
}));
