#!/bin/env bash

# LazyShell Install Script
# Usage: curl -fsSL https://raw.githubusercontent.com/bernoussama/lazyshell/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
REPO="bernoussama/lazyshell"
BINARY_NAME="lsh"
INSTALL_DIR="/usr/local/bin"
TEMP_DIR="/tmp/lazyshell-install"

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Detect operating system
detect_os() {
  local os
  case "$(uname -s)" in
  Linux*)
    os="linux"
    ;;
  Darwin*)
    os="darwin"
    ;;
  CYGWIN* | MINGW* | MSYS*)
    os="win32"
    ;;
  *)
    log_error "Unsupported operating system: $(uname -s)"
    exit 1
    ;;
  esac
  echo "$os"
}

# Detect architecture
detect_arch() {
  local arch
  case "$(uname -m)" in
  x86_64 | amd64)
    arch="x64"
    ;;
  arm64 | aarch64)
    arch="arm64"
    ;;
  *)
    log_error "Unsupported architecture: $(uname -m)"
    exit 1
    ;;
  esac
  echo "$arch"
}

# Get binary name based on OS and architecture
get_binary_name() {
  local os="$1"
  local arch="$2"
  local binary_name

  case "$os" in
  linux)
    binary_name="lsh-linux-${arch}"
    ;;
  darwin)
    binary_name="lsh-darwin-${arch}"
    ;;
  win32)
    binary_name="lsh-win32-${arch}.exe"
    ;;
  *)
    log_error "Unsupported OS: $os"
    exit 1
    ;;
  esac

  echo "$binary_name"
}

# Check required commands
check_requirements() {
  local missing_commands=()

  if ! command_exists curl; then
    missing_commands+=("curl")
  fi

  if ! command_exists jq; then
    if command_exists python3; then
      log_info "jq not found, will use python3 for JSON parsing"
    elif command_exists python; then
      log_info "jq not found, will use python for JSON parsing"
    else
      missing_commands+=("jq or python")
    fi
  fi

  if [ ${#missing_commands[@]} -ne 0 ]; then
    log_error "Missing required commands: ${missing_commands[*]}"
    log_error "Please install them and try again"
    exit 1
  fi
}

# Parse JSON without jq (fallback)
parse_json() {
  local json_data="$1"
  local key="$2"

  if command_exists jq; then
    echo "$json_data" | jq -r "$key"
  elif command_exists python3; then
    echo "$json_data" | python3 -c "import sys, json; print(json.load(sys.stdin)$key)"
  elif command_exists python; then
    echo "$json_data" | python -c "import sys, json; print(json.load(sys.stdin)$key)"
  else
    log_error "Cannot parse JSON without jq or python"
    exit 1
  fi
}

# Get latest release info from GitHub API
get_latest_release() {
  local api_url="https://api.github.com/repos/${REPO}/releases/latest"
  local release_data

  log_info "Fetching latest release information..."

  if ! release_data=$(curl -fsSL "$api_url"); then
    log_error "Failed to fetch release information from GitHub API"
    exit 1
  fi

  echo "$release_data"
}

# Download and install binary
install_binary() {
  local binary_name="$1"
  local download_url="$2"
  local install_path="$INSTALL_DIR/$BINARY_NAME"

  # Create temp directory
  mkdir -p "$TEMP_DIR"

  local temp_file="$TEMP_DIR/$binary_name"

  log_info "Downloading $binary_name..."
  if ! curl -fsSL -o "$temp_file" "$download_url"; then
    log_error "Failed to download binary"
    exit 1
  fi

  # Verify download
  if [ ! -f "$temp_file" ]; then
    log_error "Downloaded file not found"
    exit 1
  fi

  # Check if install directory is writable
  if [ ! -w "$INSTALL_DIR" ]; then
    log_warning "Cannot write to $INSTALL_DIR, trying with sudo..."
    if ! sudo mkdir -p "$INSTALL_DIR"; then
      log_error "Failed to create install directory"
      exit 1
    fi
    if ! sudo cp "$temp_file" "$install_path"; then
      log_error "Failed to install binary"
      exit 1
    fi
    if ! sudo chmod +x "$install_path"; then
      log_error "Failed to make binary executable"
      exit 1
    fi
  else
    # Install without sudo
    if ! cp "$temp_file" "$install_path"; then
      log_error "Failed to install binary"
      exit 1
    fi
    if ! chmod +x "$install_path"; then
      log_error "Failed to make binary executable"
      exit 1
    fi
  fi

  log_success "Binary installed to $install_path"
}

# Verify installation
verify_installation() {
  local install_path="$INSTALL_DIR/$BINARY_NAME"

  if [ ! -f "$install_path" ]; then
    log_error "Installation verification failed: binary not found"
    exit 1
  fi

  if [ ! -x "$install_path" ]; then
    log_error "Installation verification failed: binary not executable"
    exit 1
  fi

  # Check if binary is in PATH
  if ! command_exists "$BINARY_NAME"; then
    log_warning "$INSTALL_DIR is not in your PATH"
    log_warning "Add it to your PATH or use the full path: $install_path"
  else
    log_success "Installation verified successfully"
    log_info "You can now run: $BINARY_NAME --help"
  fi
}

# Main installation function
main() {
  log_info "Starting LazyShell installation..."

  # Check requirements
  check_requirements

  # Detect system
  local os arch binary_name
  os=$(detect_os)
  arch=$(detect_arch)
  binary_name=$(get_binary_name "$os" "$arch")

  log_info "Detected system: $os $arch"
  log_info "Target binary: $binary_name"

  # Check for unsupported combinations
  if [ "$os" = "darwin" ] && [ "$arch" = "arm64" ]; then
    log_info "Detected Apple Silicon Mac"
  elif [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
    log_info "Detected Intel Mac"
  elif [ "$os" = "linux" ] && [ "$arch" = "x64" ]; then
    log_info "Detected Linux x64"
  elif [ "$os" = "win32" ]; then
    log_warning "Windows detected - this script may not work properly"
    log_warning "Consider downloading the binary manually"
  else
    log_error "Unsupported system combination: $os $arch"
    exit 1
  fi

  # Get latest release
  local release_data
  release_data=$(get_latest_release)

  # Extract version and download URL
  local version download_url
  if command_exists jq; then
    version=$(echo "$release_data" | jq -r '.tag_name')
    download_url=$(echo "$release_data" | jq -r ".assets[] | select(.name == \"$binary_name\") | .browser_download_url")
  else
    # Fallback JSON parsing
    version=$(echo "$release_data" | grep -o '"tag_name":"[^"]*' | cut -d'"' -f4)
    download_url=$(echo "$release_data" | grep -o "\"browser_download_url\":\"[^\"]*$binary_name\"" | cut -d'"' -f4)
  fi

  if [ -z "$version" ]; then
    log_error "Failed to extract version from release data"
    exit 1
  fi

  if [ -z "$download_url" ]; then
    log_error "Failed to find download URL for $binary_name"
    log_error "This system combination might not be supported yet"
    exit 1
  fi

  log_info "Latest version: $version"
  log_info "Download URL: $download_url"

  # Check if already installed
  if command_exists "$BINARY_NAME"; then
    local current_version
    current_version=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
    log_info "Current version: $current_version"

    if [ "$current_version" = "$version" ]; then
      log_success "Latest version is already installed"
      exit 0
    fi

    log_info "Updating from $current_version to $version"
  fi

  # Download and install
  install_binary "$binary_name" "$download_url"

  # Verify installation
  verify_installation

  log_success "LazyShell $version has been successfully installed!"
  log_info "Run '$BINARY_NAME --help' to get started"
}

# Run main function
main "$@"
