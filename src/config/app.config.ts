import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT!) || 3000,
  baseUrl: process.env.BASE_URL,
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH!),
  counterBatchSize: parseInt(process.env.COUNTER_BATCH_SIZE!) || 1000,
}));
