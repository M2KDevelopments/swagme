# Swagme
![Static Badge](https://img.shields.io/badge/v1.0.10-maroon?style=plastic&logo=npm&logoColor=maroon&logoSize=20&label=version)
![Static Badge](https://img.shields.io/badge/MIT-green?style=plastic&logo=license&logoColor=green&label=license)
![Static Badge](https://img.shields.io/badge/m2kdevelopments-purple?style=plastic&logo=github&logoColor=purple&label=developer&link=https%3A%2F%2Fgithub.com%2Fm2kdevelopments)
![Static Badge](https://img.shields.io/badge/buy_me_a_coffee-yellow?style=plastic&logo=buymeacoffee&logoColor=yellow&label=support&link=https%3A%2F%2Fwww.buymeacoffee.com%2Fm2kdevelopments)
![Static Badge](https://img.shields.io/badge/paypal-blue?style=plastic&logo=paypal&logoColor=blue&label=support&link=https%3A%2F%2Fpaypal.me%2Fm2kdevelopment)

## About
Node Js CLI tool that auto generates swagger api documentation for express web and nextjs servers. Takes advantage of the MVC Pattern. Supports **Mongoose**, **Prisma**, and **Drizzle** database schemas.

---

## Quick Start
This will interactively create **swag.config.json**, **swagger.json** and **swagger.yml** based on your project.
```bash
npx swagme
```

## For Usage Instructions
```bash
npx swagme --help
```

---

## Installation
```bash
npm install -g swagme
```

---

## Prerequisites

### Required Dependencies
Your project must have **Express** installed:
```bash
npm install express
```

### Recommended Dependencies
For displaying Swagger documentation:
```bash
npm install swagger-ui-express yaml
```

### Database Support (Optional)
Swagme can auto-generate schemas from your database models:
- **Mongoose**: `npm install mongoose`
- **Prisma**: `npm install @prisma/client`
- **Drizzle**: `npm install drizzle-orm`

---

## CLI Commands

### Default Command
Run the full interactive setup (configure + build):
```bash
swagme
```
This will:
- Create a `swag.config.json` configuration file
- Scan your Express routes and database schemas
- Generate `swagger.json` and `swagger.yml` files
- Create a docs folder with route and schema definitions

---

### `npx swagme run`
Run the full workflow with options for customization.

**Usage:**
```bash
npx swagme run [directory] [options]
```

**Arguments:**
- `[directory]` - Working directory of the project (default: current directory)

**Options:**
- `-y, --auto` - Auto configure and build without prompts
- `-c, --config` - Only configure (create config file)
- `-b, --build` - Only build swagger files
- `-r, --routes` - Update routes (default: true)
- `-s, --schemas` - Update schemas (default: true)
- `--scan` - Scan project files for routes and schemas
- `--json` - Build only swagger.json file
- `--yaml` - Build only swagger.yml file

**Examples:**
```bash
# Interactive setup in current directory
npx swagme run

# Auto-configure without prompts
npx swagme run -y

# Build only, skip configuration
npx swagme run -b

# Scan project and build both JSON and YAML
npx swagme run --scan --json --yaml

# Build only JSON file
npx swagme run -b --json

# Build only YAML file
npx swagme run -b --yaml

# Run in specific directory
npx swagme run /path/to/project -y
```

---

### `npx swagme config`
Generate only the configuration file without building documentation.

**Usage:**
```bash
npx swagme config [options]
```

**Options:**
- `-y, --auto` - Auto configure without prompts
- `-p, --dir` - Project directory/folder (default: current directory)

**Examples:**
```bash
# Interactive configuration
npx swagme config

# Auto-configure without prompts
npx swagme config -y

# Configure specific directory
npx swagme config -p /path/to/project
```

---

### `npx swagme build`
Build swagger documentation files from existing configuration.

**Usage:**
```bash
npx swagme build [options]
```

**Options:**
- `-p, --dir` - Project directory/folder (default: current directory)
- `--json` - Build only swagger.json file
- `--yaml` - Build only swagger.yml file
- `-r, --routes` - Update routes (default: true)
- `-s, --schemas` - Update schemas (default: true)
- `--scan` - Scan project files for routes and schemas

**Examples:**
```bash
# Build with existing config
npx swagme build

# Build and scan project files
npx swagme build --scan

# Build only JSON
npx swagme build --json

# Build only YAML
npx swagme build --yaml

# Build without updating routes
npx swagme build --no-routes

# Build without updating schemas
npx swagme build --no-schemas
```

---

### `npx swagme del`
Remove all swagme configuration files and folders.

**Usage:**
```bash
npx swagme del [options]
```

**Options:**
- `-p, --dir` - Project directory/folder (default: current directory)
- `-y, --auto` - Auto delete all swagme files and folders without confirmation prompt (default: false)

**Examples:**
```bash
# Delete swagme files from current directory (with confirmation prompt)
npx swagme del

# Auto-delete without confirmation prompt
npx swagme del -y

# Delete from specific directory
npx swagme del -p /path/to/project

# Auto-delete from specific directory without prompt
npx swagme del -p /path/to/project -y
```

---

## Configuration File

The `swag.config.json` file stores your project settings:

```json
{
  "name": "My API",
  "version": "1.0.0",
  "description": "API Documentation",
  "routes": "src/routes",
  "schema": "src/models",
  "docs": "docs",
  "main": "src/app.js",
  "database": "mongoose",
  "authorization": "bearer",
  "gitignore": true
}
```

**Configuration Options:**
- **name** - API name
- **version** - API version
- **description** - API description
- **routes** - Path to routes folder
- **schema** - Path to database models/schemas folder
- **docs** - Output folder for generated documentation
- **main** - Main Express application file
- **database** - Database type (`mongoose`, `prisma`, or `drizzle`)
- **authorization** - Authorization type (e.g., `bearer`)
- **gitignore** - Whether to add docs folder to .gitignore

---

## Swagger UI Setup

### Express.js Setup
```js
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const SwaggerUI = require('swagger-ui-express');
const YAML = require('yaml');

// Load swagger documentation
const swaggerdocs = YAML.parse(
  fs.readFileSync(path.join(__dirname, 'swagger.yml'), 'utf-8')
);
// Or use JSON: const swaggerdocs = require('./swagger.json');

// Swagger documentation endpoint
app.use('/api/docs', SwaggerUI.serve, SwaggerUI.setup(swaggerdocs));

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Swagger docs at http://localhost:3000/api/docs');
});
```

---

## Workflow Examples

### First Time Setup
```bash
# 1. Install swagme globally
npm install -g swagme

# 2. Navigate to your Express project
cd my-express-project

# 3. Run interactive setup
npx swagme

# 4. Follow the prompts to configure your project
```

### Daily Development Workflow
```bash
# After making changes to routes or schemas, rebuild documentation
npx swagme build --scan
```

### CI/CD Integration
```bash
# Auto-build documentation without prompts
npx swagme run -y --scan
```

---

## Features

✅ **Auto-detect Express routes** - Scans your route files automatically  
✅ **Database schema support** - Works with Mongoose, Prisma, and Drizzle  
✅ **Multiple output formats** - Generate JSON and/or YAML  
✅ **Interactive CLI** - User-friendly prompts for configuration  
✅ **Auto mode** - Skip prompts for CI/CD pipelines  
✅ **Gitignore integration** - Optionally add docs to .gitignore  
✅ **Authorization support** - Configure API authorization schemes  

---

## Troubleshooting

### Express dependency not found
```bash
npm install express
```

### Swagger UI Express not found
```bash
npm install swagger-ui-express
```

---

## Support

<a href="https://www.buymeacoffee.com/m2kdevelopments" target="_blank">
<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>

## Support (from Malawi or USA)
<a href="https://give.paychangu.com/dc-RqLWVw" target="_blank">
    <div style="padding:10px 10px; border-radius:30px; color:white;background:cyan; display:flex; gap:2px; width:300px; height:100px;">
        Support via Paychangu
    </div>
</a>
---

## License
MIT License - See LICENSE file for details

## Links
- **GitHub**: [M2KDevelopments/swagme](https://github.com/M2KDevelopments/swagme)
- **NPM**: [swagme](https://www.npmjs.com/package/swagme)
- **Issues**: [Report a bug](https://github.com/M2KDevelopments/swagme/issues)
