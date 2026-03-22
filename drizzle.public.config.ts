import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/content-schema.ts', './src/business-schema.ts', './src/booking-schema.ts', './src/giftcert-schema.ts', './src/intake-schema.ts'],
  out: './drizzle-public',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['public'],
});
