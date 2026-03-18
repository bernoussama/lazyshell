import os from 'os';

export interface HardwareInfo {
  cpu: string;
  memory: string;
  arch: string;
  gpu: string;
}

async function getGpuInfo(): Promise<string> {
  try {
    const si = await import('systeminformation').catch(() => null);

    if (si) {
      const graphics = await si.graphics();
      if (graphics.controllers && graphics.controllers.length > 0) {
        const gpu = graphics.controllers[0];
        let gpuInfo = gpu.model || gpu.name || 'Unknown GPU';

        if (gpu.vendor && !gpuInfo.toLowerCase().includes(gpu.vendor.toLowerCase())) {
          gpuInfo = `${gpu.vendor} ${gpuInfo}`;
        }

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

  return 'GPU info unavailable (install systeminformation for detailed info)';
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  try {
    const cpu = os.cpus()[0]?.model || 'Unknown CPU';
    const memory = `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`;
    const arch = os.arch();
    const gpu = await getGpuInfo();

    return { cpu, memory, arch, gpu };
  } catch {
    return {
      cpu: 'Unknown CPU',
      memory: 'Unknown Memory',
      arch: 'Unknown Architecture',
      gpu: 'Unknown GPU',
    };
  }
}
