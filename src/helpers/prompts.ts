import { IPackageJSON } from "../interfaces/package.json.ts";
import { ISwaggerConfig } from "../interfaces/swagme.config.ts";

export function getProjectPrompts(mainRouteFile: string, config_json: ISwaggerConfig | any, package_json: IPackageJSON) {
    return [
        {
            "type": "input",
            "name": "name",
            "message": "Name of Express API",
            "default": config_json.name || package_json.name
        },
        {
            "type": "input",
            "name": "version",
            "message": "Version",
            "default": config_json.version || package_json.version || "1.0.0",
        },
        {
            "type": "input",
            "name": "description",
            "message": "Project description",
            "default": config_json.description || package_json.description || "",
        },
        {
            "type": "list",
            "name": "authorization",
            "message": "Authorization Type",
            "choices": [
                "None",
                "Bearer",
                "Basic",
            ]
        },
        {
            "type": "input",
            "name": "baseurl",
            "message": "Base URL",
            "default": config_json.baseurl || "http://localhost:3000",
        },
        {
            "type": "input",
            "name": "main",
            "message": "Path where you've defined your express app. e.g 'const app = express();' ",
            "default": config_json.main || mainRouteFile,
        },
        {
            "type": "list",
            "name": "database",
            "message": "Choose Database, ODM or ORM:",
            "choices": [
                "mongoose",
                "prisma",
                "drizzle"
            ]
        },
        {
            "type": "input",
            "name": "schema",
            "message": "Where is a folder for your schemas or models? (To ignore models/schema leave it blank)",
            "default": config_json.schema || "/models",
        },
        {
            "type": "input",
            "name": "routes",
            "message": "Where is a folder for your routes?",
            "default": config_json.routes || "/routes"
        },
        {
            "type": "input",
            "name": "docs",
            "message": "Where to put the swagme files?",
            "default": config_json.docs || "/docs"
        },
        {
            "type": "boolean",
            "name": "gitignore",
            "message": "Git ignore Swagme files and folders?",
            "default": config_json.gitignore == undefined || true
        },
    ] as Array<any>
}

export function getFilePathPrompts(schemaFileList: Array<string>, routeFileList: Array<string>) {
    // Routes and Schema files
    const promptFileAndFolders: Array<any> = [
        {
            "type": "checkbox",
            "name": "routefiles",
            "message": "Choose Files for where routers are defined",
            "choices": ['SELECT ALL', ...routeFileList.filter(name => name.includes('.'))]
        },

    ];

    // Add Schema Prompt
    if (schemaFileList.length) {
        promptFileAndFolders.unshift({
            "type": "checkbox",
            "name": "schemafiles",
            "message": "Choose Files for where your models/schemas are defined",
            "choices": ['SELECT ALL', ...schemaFileList.filter(name => name.includes('.'))]
        })
    }

    return promptFileAndFolders;
}   