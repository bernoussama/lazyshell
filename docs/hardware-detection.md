# Hardware Detection

This module provides cross-platform hardware detection capabilities for Node.js applications.

## Features

- **CPU Information**: Detects CPU model and specifications
- **Memory Information**: Gets total system memory in GB
- **Architecture**: System architecture (x64, arm64, etc.)
- **GPU Information**: Detects graphics card details including vendor, model, and VRAM

## Usage

### Basic Usage

```typescript
import { getHardwareInfo } from './src/helpers/hardware.js';

async function example() {
  const hardware = await getHardwareInfo();
  
  console.log('CPU:', hardware.cpu);
  console.log('Memory:', hardware.memory);
  console.log('Architecture:', hardware.arch);
  console.log('GPU:', hardware.gpu);
}
```

### Example Output

```json
{
  "cpu": "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz",
  "memory": "31 GB",
  "arch": "x64",
  "gpu": "Intel Corporation CoffeeLake-H GT2 [UHD Graphics 630] (256MB VRAM)"
}
```

## GPU Detection

The GPU detection uses the `systeminformation` library when available, which provides detailed information about graphics controllers including:

- Vendor (Intel, NVIDIA, AMD, etc.)
- Model name
- VRAM size
- Additional technical details

### Fallback Behavior

If `systeminformation` is not available or fails to detect GPU information, the function gracefully falls back to:

```
"GPU info unavailable (install systeminformation for detailed info)"
```

## Installation

The hardware detection functionality requires the `systeminformation` package:

```bash
npm install systeminformation
# or
pnpm add systeminformation
```

## Platform Support

- **Linux**: Full support with detailed GPU information
- **macOS**: Full support with detailed GPU information  
- **Windows**: Full support with detailed GPU information
- **Other platforms**: Basic CPU/memory info with generic GPU fallback

## Error Handling

The function includes comprehensive error handling:

- Returns default values if hardware detection fails
- Gracefully handles missing dependencies
- Provides informative fallback messages
- Never throws unhandled exceptions

## TypeScript Support

Full TypeScript support with proper type definitions:

```typescript
interface HardwareInfo {
  cpu: string;
  memory: string;
  arch: string;
  gpu: string;
}
``` 