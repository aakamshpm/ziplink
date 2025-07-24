import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT!) || 3000,
  baseUrl: process.env.BASE_URL,
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH!),

  // todo: add rest of env
}));
