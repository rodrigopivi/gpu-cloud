export const PORT = process.env.PORT || 3000;
export const NODE_ENV = 'development';

// for free nvidia nim https://build.nvidia.com/nvidia/nemotron-3-nano-30b-a3b
export const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || 'your-nvidia-api-key-here';

export const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  nvidiaApiKey: NVIDIA_API_KEY,
};

export default config;
