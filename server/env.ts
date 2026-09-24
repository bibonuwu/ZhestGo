// Imported first by index.ts so .env is loaded before other modules read process.env.
import { config } from 'dotenv';

config({ quiet: true });
