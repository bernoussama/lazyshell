import fs from 'fs';

/**
 * Detect the system-level package manager for the current Linux distribution
 * @returns The detected package manager name or undefined if none found
 */
export function getDistroPackageManager(): string | undefined {
  try {
    // Check for common package managers by looking for their binaries/directories
    if (fs.existsSync('/usr/bin/brew')) {
      return 'brew'; // Homebrew
    }
    if (fs.existsSync('/usr/bin/apt') || fs.existsSync('/usr/bin/apt-get')) {
      return 'apt'; // Debian/Ubuntu
    }
    if (fs.existsSync('/usr/bin/dnf')) {
      return 'dnf'; // Fedora/RHEL 8+
    }
    if (fs.existsSync('/usr/bin/yum')) {
      return 'yum'; // RHEL/CentOS (older)
    }
    if (fs.existsSync('/usr/bin/yay')) {
      return 'yay'; // Arch Linux (AUR)
    }
    if (fs.existsSync('/usr/bin/pacman')) {
      return 'pacman'; // Arch Linux
    }
    if (fs.existsSync('/usr/bin/zypper')) {
      return 'zypper'; // openSUSE
    }
    if (fs.existsSync('/usr/bin/emerge')) {
      return 'emerge'; // Gentoo
    }
    if (fs.existsSync('/usr/bin/apk')) {
      return 'apk'; // Alpine Linux
    }
    if (fs.existsSync('/usr/bin/xbps-install')) {
      return 'xbps'; // Void Linux
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get common install command for the detected package manager
 * @param packageName The package name to install
 * @returns The install command or undefined if package manager not detected
 */
export function getInstallCommand(packageName: string): string | undefined {
  const pm = getDistroPackageManager();
  
  if (!pm) return undefined;
  
  const installCommands: Record<string, string> = {
    'apt': `sudo apt install ${packageName}`,
    'yum': `sudo yum install ${packageName}`,
    'dnf': `sudo dnf install ${packageName}`,
    'pacman': `sudo pacman -S ${packageName}`,
    'zypper': `sudo zypper install ${packageName}`,
    'emerge': `sudo emerge ${packageName}`,
    'apk': `sudo apk add ${packageName}`,
    'xbps': `sudo xbps-install ${packageName}`,
  };
  
  return installCommands[pm];
} 