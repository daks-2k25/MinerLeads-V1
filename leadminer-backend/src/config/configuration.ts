export interface AppConfig {
  env: string;
  port: number;
  corsOrigin: string;
  database: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  googlePlaces: {
    apiKey?: string;
    creditLimit: number;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    creditLimit: parseInt(process.env.GOOGLE_API_CREDIT_LIMIT ?? '200', 10),
  },
});
