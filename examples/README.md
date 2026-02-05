# MCP Client Configuration Examples

This directory contains example MCP configuration files for various clients.

## Usage

1. Copy the appropriate example file for your MCP client
2. Replace `/path/to/rxresume-mcp` with the actual path to this repository
3. Update `RXRESUME_BASE_URL` if using a self-hosted instance
4. Set your `RXRESUME_API_KEY` (recommended) or authenticate via the `authenticate` tool
5. Add to your client's MCP configuration file

## Configuration File Locations

| Client | Config Path |
|--------|-------------|
| **Claude Desktop (macOS)** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Windsurf (macOS/Linux)** | `~/.codeium/windsurf/mcp_config.json` |
| **Windsurf (Windows)** | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| **Cursor (Project)** | `.cursor/mcp.json` |
| **Cursor (Global)** | `~/.cursor/mcp.json` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RXRESUME_BASE_URL` | Yes | URL of your Reactive Resume v5 instance |
| `RXRESUME_API_KEY` | No | API key for authentication (create in Settings > API Keys) |

## Client-Specific Notes

### Claude Desktop

- Claude Desktop now supports **Desktop Extensions** for easier installation
- Legacy JSON config (shown in examples) still works for manual setup
- Check connection status via **Settings > Extensions** or the "+" button > "Connectors"

### Cursor

- Supports variable interpolation in config values:
  - `${userHome}` - path to your home folder
  - `${env:NAME}` - environment variables
  - `${workspaceFolder}` - project root directory
- Enable MCP servers in **Cursor Settings > MCP**

### Windsurf

- Configure via **Windsurf Settings** panel or edit `mcp_config.json` directly
- MCP Plugin Store available for one-click setup of common servers
- Supports SSE MCP servers in JSON configuration

## General Notes

- After updating config, restart or refresh your MCP client
- Authentication can be done via:
  1. **API Key** (recommended): Set `RXRESUME_API_KEY` in env config
  2. **Legacy auth**: Use the `authenticate` tool with username/password
