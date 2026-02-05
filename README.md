# Reactive Resume MCP Server

An Model Context Protocol server that enables natural language manipulation of resumes in [Reactive Resume](https://rxresu.me/).

**[NEW] Compatible with Reactive Resume v5** - Uses OpenAPI endpoints with API key authentication.

## Features

- **Authentication** - API key (recommended) or email/password
- **Resume Management** - Create, list, update, delete resumes
- **Section Editing** - Modify any resume section (experience, education, skills, etc.)
- **Item Management** - Add, update, or remove items from sections
- **Visibility Control** - Toggle section visibility, set resume public/private
- **Export** - Export resume as JSON

## Prerequisites

- Node.js 18+
- A running Reactive Resume instance (self-hosted, hosted, or directly from [rxresu.me](https://rxresu.me))
- User account on the Reactive Resume instance

## Installation

```bash
# Clone the repository
git clone https://github.com/Zaroganos/rxresume-mcp.git
cd rxresume-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

Base URL of your Reactive Resume instance
Examples:

- Self-hosted: https://resume.yourdomain.com
- Cloud: https://rxresu.me

```env
RXRESUME_BASE_URL=https://your-instance-url.com
```

API Key Authentication (RECOMMENDED for v5)
Create an API key in Settings > API Keys in your Reactive Resume dashboard

```env
RXRESUME_API_KEY=your-api-key-here
```

Legacy Authentication (fallback if API key not provided)

```env
RXRESUME_EMAIL=your@email.com
RXRESUME_PASSWORD=yourpassword
```

| Variable | Required | Description |
|----------|----------|-------------|
| `RXRESUME_BASE_URL` | Yes | The URL of your Reactive Resume instance |
| `RXRESUME_API_KEY` | No* | API key for v5 authentication (recommended) |
| `RXRESUME_EMAIL` | No* | Email for legacy authentication |
| `RXRESUME_PASSWORD` | No* | Password for legacy authentication |

*At least one authentication method is required. API key takes priority if both are provided.

## Testing

Test API connectivity:

```bash
# Without auth (health check only)
npm run test:api

# With API key (recommended)
RXRESUME_API_KEY=your-api-key npm run test:api

# With email/password (legacy)
RXRESUME_EMAIL=your@email.com RXRESUME_PASSWORD=yourpassword npm run test:api
```

## Usage with MCP Clients

> **NB**: Replace `/path/to/rxresume-mcp` with the actual absolute path to your cloned repository.
> **NB**: After saving the config file, refresh or restart that application for it to read the updated config.

### Claude Desktop

Add to your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rxresume": {
      "command": "node",
      "args": ["/path/to/rxresume-mcp/dist/index.js"],
      "env": {
        "RXRESUME_BASE_URL": "https://your-instance-url.com",
        "RXRESUME_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration (`.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "rxresume": {
      "command": "node",
      "args": ["${userHome}/path/to/rxresume-mcp/dist/index.js"],
      "env": {
        "RXRESUME_BASE_URL": "https://your-instance-url.com",
        "RXRESUME_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration file:

- **macOS/Linux**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

You can also access this file via Windsurf: *Settings → Cascade → MCP Servers → View Raw Config*

```json
{
  "mcpServers": {
    "rxresume": {
      "command": "node",
      "args": ["/path/to/rxresume-mcp/dist/index.js"],
      "env": {
        "RXRESUME_BASE_URL": "https://your-instance-url.com",
        "RXRESUME_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, consult your client's documentation for the config file location. The general format is the same:

```json
{
  "mcpServers": {
    "rxresume": {
      "command": "node",
      "args": ["/path/to/rxresume-mcp/dist/index.js"],
      "env": {
        "RXRESUME_BASE_URL": "https://your-instance-url.com",
        "RXRESUME_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### Connection & Authentication

| Tool | Description |
|------|-------------|
| `check_connection` | Verify the Reactive Resume instance is accessible |
| `set_base_url` | Change the target Reactive Resume instance URL |
| `authenticate` | Authenticate with API key (recommended) or email/password |
| `get_current_user` | Get info about the authenticated user |

### Resume Management

| Tool | Description |
|------|-------------|
| `list_resumes` | List all resumes for the user |
| `get_resume` | Get full resume details by ID |
| `get_resume_section` | Get a specific section from a resume |
| `create_resume` | Create a new resume |
| `delete_resume` | Delete a resume (requires confirmation) |
| `export_resume_json` | Export resume as JSON |
| `update_resume_visibility` | Set resume public or private |

### Content Editing

| Tool | Description |
|------|-------------|
| `update_resume_basics` | Update name, headline, email, phone, location, URL |
| `update_summary` | Update the professional summary |
| `add_experience` | Add a work experience entry |
| `add_education` | Add an education entry |
| `add_skill` | Add a skill |
| `add_project` | Add a project |
| `update_section_item` | Update any item in a section |
| `remove_section_item` | Remove an item from a section |
| `toggle_section_visibility` | Show/hide a section |

## Example Conversations

### Creating a new resume

```
User: Create a new resume called "Software Engineer 2024"
Assistant: [calls create_resume with title="Software Engineer 2024"]
```

### Adding work experience

```
User: Add my job at Google as a Senior Software Engineer from 2020 to 2023
Assistant: [calls add_experience with company="Google", position="Senior Software Engineer", date="2020 - 2023"]
```

### Updating skills

```
User: Add Python, JavaScript, and TypeScript to my skills
Assistant: [calls add_skill multiple times for each skill]
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

```
src/
├── index.ts        # MCP server entry point with tool definitions
├── api-client.ts   # Reactive Resume REST API client
├── types.ts        # TypeScript type definitions
├── test-api.ts     # API connectivity test script
└── test-create.ts  # Resume creation test script
```

## Security Notes

- Credentials are only stored in memory during the session
- Tokens are transmitted via HTTP headers (ensure HTTPS in production)
- The MCP server does not persist any sensitive data

## Related Resources

- [Reactive Resume](https://rxresu.me/) - The resume builder this MCP server integrates with
- [Reactive Resume Self-Hosting Guide](https://docs.rxresu.me/product-guides/self-hosting-reactive-resume-using-docker) - Instructions for self-hosting
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification and documentation

## Acknowledgements

Much Gratitude to [Amruth Pillai](https://github.com/AmruthPillai) for creating [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) — a free, open-source, and secure resume builder empowering job seekers worldwide.

## License

MPL-2.0
