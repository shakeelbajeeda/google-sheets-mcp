# Google Sheets MCP Server

A Model Context Protocol (MCP) server for seamless Google Sheets integration. This server provides a comprehensive set of tools for reading, writing, formatting, and managing Google Sheets documents directly from your MCP client.

## ✨ Features

- **Comprehensive Sheet Operations**: Read, write, format, and manage spreadsheets
- **Advanced Formatting**: Cell formatting, borders, merging, conditional formatting
- **Chart Support**: Create, update, and delete various chart types
- **Batch Operations**: Efficient bulk operations for better performance
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Error Handling**: Robust error handling and validation
- **Modern Architecture**: Built with modern Node.js and TypeScript

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- Google Cloud Project with Sheets API enabled
- Service Account with JSON key file

### Installation

```bash
# Clone the repository
git clone https://github.com/shakeelbajeeda/google-sheets-mcp.git
cd google-sheets-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Google Cloud Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API" and click "Enable"

3. **Create Service Account**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Download the JSON key file

4. **Share Your Spreadsheets**
   - Open your Google Sheet
   - Click Share and add the service account email (from JSON file)
   - Grant "Editor" permissions


**Note**: When using `GOOGLE_SERVICE_ACCOUNT_KEY`:
- The entire JSON must be on a single line
- All quotes must be escaped with backslashes
- Newlines in the private key must be represented as `\\n`

## 🛠️ Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Run tests
npm test

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Clean build artifacts
npm run clean

# Run MCP inspector for debugging
npm run inspector
```

### Using Task Runner

If you have [Task](https://taskfile.dev) installed:

```bash
# Install dependencies
task install

# Build the project
task build

# Run in development mode
task dev

# Run all checks
task check
```

### Development Setup

1. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your credentials
```

2. **Run in Development Mode**
```bash
npm run dev  # Watch mode with auto-reload
```

## 📋 Available Tools

### 📖 Reading Data
| Tool | Description |
|------|-------------|
| `sheets_get_values` | Read values from a specific range |
| `sheets_batch_get_values` | Read values from multiple ranges efficiently |
| `sheets_get_metadata` | Get comprehensive spreadsheet information |
| `sheets_check_access` | Verify access permissions and capabilities |

### ✍️ Writing Data
| Tool | Description |
|------|-------------|
| `sheets_update_values` | Update values in a specific range |
| `sheets_batch_update_values` | Update values in multiple ranges |
| `sheets_append_values` | Append new rows to existing data |
| `sheets_clear_values` | Clear cell contents while preserving formatting |

### 📊 Sheet Management
| Tool | Description |
|------|-------------|
| `sheets_insert_sheet` | Add a new sheet to the spreadsheet |
| `sheets_delete_sheet` | Remove a sheet from the spreadsheet |
| `sheets_duplicate_sheet` | Create a copy of an existing sheet |
| `sheets_copy_to` | Copy a sheet to another spreadsheet |
| `sheets_update_sheet_properties` | Modify sheet properties (title, grid, tab color) |

### ⚡ Batch Operations
| Tool | Description |
|------|-------------|
| `sheets_batch_delete_sheets` | Delete multiple sheets in one operation |
| `sheets_batch_format_cells` | Apply formatting to multiple cell ranges |

### 🎨 Cell Formatting
| Tool | Description |
|------|-------------|
| `sheets_format_cells` | Apply comprehensive cell formatting (colors, fonts, alignment, number formats) |
| `sheets_update_borders` | Add or modify cell borders |
| `sheets_merge_cells` | Merge cells together |
| `sheets_unmerge_cells` | Unmerge previously merged cells |
| `sheets_add_conditional_formatting` | Apply conditional formatting rules |

### 📈 Charts
| Tool | Description |
|------|-------------|
| `sheets_create_chart` | Create various chart types (column, bar, line, pie, scatter, etc.) |
| `sheets_update_chart` | Modify existing chart properties |
| `sheets_delete_chart` | Remove charts from the spreadsheet |

## 🔧 Architecture

### Type Safety with Zod

All tools use Zod schemas for runtime validation and type safety:

```typescript
// Example: Delete Sheet Tool
export const deleteSheetTool: ToolConfig = {
  title: 'sheets_delete_sheet',
  description: 'Delete a sheet from a Google Sheets spreadsheet',
  inputSchema: z.object({
    spreadsheetId: z.string().describe('The ID of the spreadsheet'),
    sheetId: z.number().describe('The ID of the sheet to delete'),
  }),
};
```

### Error Handling

Comprehensive error handling with detailed error messages:

```typescript
// Example error handling
export async function handleDeleteSheet({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  try {
    // ... implementation
  } catch (error) {
    return handleError(error);
  }
}
```

### Modular Structure

```
src/
├── tools/           # Individual tool implementations
├── utils/           # Shared utilities and helpers
├── types/           # TypeScript type definitions
└── config/          # Configuration constants
```

## 🔍 Finding IDs

### Spreadsheet ID
Extract from the URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                        ↑ This is the spreadsheet ID
```

### Sheet ID
Use `sheets_get_metadata` to list all sheets with their IDs.

### Chart ID
Use `sheets_get_metadata` to find chart IDs in the spreadsheet.

## 📝 Best Practices

### Performance
- Use batch operations for multiple operations
- Limit range sizes for large datasets
- Use appropriate value input options

### Error Prevention
- Always test with a copy of your data
- Verify permissions before operations
- Use `sheets_check_access` to verify capabilities

### Data Management
- Use flexible ranges when possible
- Set appropriate permissions (read-only vs edit)
- Monitor rate limits for large operations

## ❗ Troubleshooting

### Common Issues

**Authentication Failed**
- Verify JSON key path is absolute and correct
- Ensure JSON is properly escaped if using string format
- Check GOOGLE_PROJECT_ID matches your project
- Verify Sheets API is enabled

**Permission Denied**
- Share spreadsheet with service account email
- Grant "Editor" role to service account
- Check email in JSON file (client_email field)

**Spreadsheet Not Found**
- Verify spreadsheet ID from URL
- Ensure spreadsheet is shared with service account

**MCP Connection Issues**
- Use the built version (`dist/index.js`)
- Check Node.js path in client configuration
- Review client logs for errors
- Use `npm run inspector` for debugging

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- --grep "format cells"
```

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting (`npm run check`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Zod for schema validation
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by [Google Sheets API](https://developers.google.com/sheets/api)
- Type safety with [Zod](https://zod.dev/)
- Modern development with [TypeScript](https://www.typescriptlang.org/)