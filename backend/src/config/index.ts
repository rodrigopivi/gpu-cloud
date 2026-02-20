export const PORT = process.env.PORT || 3000;
export const NODE_ENV = 'development';
export const CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3001'];

// for free nvidia nim https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b
export const NVIDIA_API_KEY = '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';

export const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  corsOrigins: CORS_ORIGINS,
  nvidiaApiKey: NVIDIA_API_KEY,
};

export default config;
