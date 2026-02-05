# MCP Client Configuration Examples

This directory contains example MCP configuration files for various clients.

## Usage

1. Copy the appropriate example file for your MCP client
2. Replace `/path/to/rxresume-mcp` with the actual path to this repository
3. Update `RXRESUME_BASE_URL` if using a self-hosted instance
4. Add to your client's MCP configuration file

## Configuration File Locations

| Client | Config Path |
|--------|-------------|
| **Claude Desktop (macOS)** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Windsurf (macOS/Linux)** | `~/.codeium/windsurf/mcp_config.json` |
| **Windsurf (Windows)** | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| **Cursor** | `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RXRESUME_BASE_URL` | Yes | URL of your Reactive Resume v5 instance |

## Notes

- After updating config, restart or refresh your MCP client
- Authentication is done via the `authenticate` tool after connection
