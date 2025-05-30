import os from 'os';

interface HardwareInfo {
  cpu: string;
  memory: string;
  arch: string;
  gpu: string;
}

async function getGpuInfo(): Promise<string> {
  try {
    // Try to dynamically import systeminformation
    const si = await import('systeminformation').catch(() => null);
    
    if (si) {
      const graphics = await si.graphics();
      if (graphics.controllers && graphics.controllers.length > 0) {
        const gpu = graphics.controllers[0];
        let gpuInfo = gpu.model || gpu.name || 'Unknown GPU';
        
        // Add vendor if available and not already included
        if (gpu.vendor && !gpuInfo.toLowerCase().includes(gpu.vendor.toLowerCase())) {
          gpuInfo = `${gpu.vendor} ${gpuInfo}`;
        }
        
        // Add VRAM info if available
        if (gpu.vram && gpu.vram > 0) {
          gpuInfo += ` (${gpu.vram}MB VRAM)`;
        }
        
        return gpuInfo.trim();
      }
    }
  } catch (error) {
    console.warn('Failed to get GPU info from systeminformation:', error);
    // Fall through to basic detection
  }
  
  // Fallback: Basic GPU detection based on platform
  const platform = os.platform();
  
  switch (platform) {
    case 'linux':
      return 'GPU info unavailable (install systeminformation for detailed info)';
    case 'darwin':
      return 'GPU info unavailable (install systeminformation for detailed info)';
    case 'win32':
      return 'GPU info unavailable (install systeminformation for detailed info)';
    default:
      return 'Unknown GPU';
  }
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  try {
    const cpu = os.cpus()[0]?.model || 'Unknown CPU';
    const memory = `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`;
    const arch = os.arch();
    const gpu = await getGpuInfo();
    
    return { cpu, memory, arch, gpu };
  } catch (error) {
    console.error('Error getting hardware info:', error);
    return {
      cpu: 'Unknown CPU',
      memory: 'Unknown Memory',
      arch: 'Unknown Architecture',
      gpu: 'Unknown GPU'
    };
  }
}
