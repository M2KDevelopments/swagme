import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { ISwagmeRoute } from '../interfaces/swagme.route.ts';
import { ISwagmeSchema } from '../interfaces/swagme.schema.ts';
import { ISwaggerConfig } from '../interfaces/swagme.config.ts';
import { CONSTANTS } from './constants.ts';

export async function generateSwaggerJson(config_json: ISwaggerConfig, __dirname: string) {

    // config file check
    if (!(config_json && config_json.name)) return console.error(
        chalk.red(CONSTANTS.config_file),
        chalk.redBright('was not found')
    );

    try {
        const swagger_json: any = {
            "openapi": "3.0.0",
            "info": {
                "title": config_json.name,
                "version": config_json.version,
                "description": config_json.description || ""
            },
            "servers": [
                {
                    "url": config_json.baseurl || ""
                }
            ],
            "components": {
                "schemas": {

                }
            },
            "paths": {}
        };


        // Authorization and Security Schema
        if (config_json.authorization == 'bearer') {
            swagger_json.components['securitySchemes'] = {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Enter your JWT token (without 'Bearer ' prefix)",
                }
            }
        }


        const schemas = await fs.readdir(path.join(__dirname, config_json.docs, 'schemas'));
        const routes = await fs.readdir(path.join(__dirname, config_json.docs, 'routes'));

        for (const filename of schemas) {
            if (!filename.includes(".json")) continue;
            const file = await fs.readFile(path.join(__dirname, config_json.docs, 'schemas', filename), 'utf-8');
            const json = JSON.parse(file);
            swagger_json.components.schemas = { ...swagger_json.components.schemas, ...json }
        }

        for (const filename of routes) {
            if (!filename.includes(".json")) continue;
            const file = await fs.readFile(path.join(__dirname, config_json.docs, 'routes', filename), 'utf-8');
            const json = JSON.parse(file);
            swagger_json.paths = { ...swagger_json.paths, ...json }
        }

        // Generate swagger.json file
        await fs.writeFile(path.join(__dirname, 'swagger.json'), JSON.stringify(swagger_json), 'utf-8');
    } catch (e) {
        console.error(chalk.red(e))
    }

}


export async function createDocsFolder(docsFolder: string): Promise<{ error: boolean }> {
    try {
        await fs.mkdir(docsFolder);
    } catch (e) {
        if (e instanceof Error) {
            if (!e.message.includes("EXIST") && !e.message.includes("file already exists")) {
                console.warn(chalk.yellow(e.message));
            }
            return { error: false }
        } else {
            console.error(chalk.red(e));
            return { error: true }
        }
    }

    try {
        await fs.mkdir(path.join(docsFolder, 'schemas'));
    } catch (e) {
        if (e instanceof Error) {
            if (!e.message.includes("EXIST") && !e.message.includes("file already exists")) {
                console.warn(chalk.yellow(e.message));
            }
        } else {
            console.error(chalk.red(e));
            return { error: true }
        }
    }

    try {
        await fs.mkdir(path.join(docsFolder, 'routes'));
    } catch (e) {
        if (e instanceof Error) {
            if (!e.message.includes("EXIST") && !e.message.includes("file already exists")) {
                console.warn(chalk.yellow(e.message));
            }
        } else {
            console.error(chalk.red(e));
            return { error: true }
        }
    }

    return { error: false };
}


export async function generateSwagmeSchemaFiles(docsFolder: string, swaggerSchemas: Array<ISwagmeSchema>) {
    for (const { tablename, fields, filename } of swaggerSchemas) {

        const properties = {} as any;
        for (const f of fields) {
            if (f.type == 'date') {
                properties[f.name] = { type: 'string', format: "date-time" };
            } else {
                properties[f.name] = { type: f.type };
            }
        }
        const data = {
            [tablename]: {
                type: "object",
                properties: properties,
            }
        }
        // Create Swagger Config Files
        await fs.writeFile(path.join(docsFolder, "schemas", filename + ".json"), JSON.stringify(data), 'utf-8');

    }
}

export async function generateSwagmeRouteFiles(docsFolder: string, swaggerRoutes: Array<ISwagmeRoute>) {
    for (const { baseroute, filename, routes, tagname } of swaggerRoutes) {

        // Configure swagger endpoints
        const endpoints = {} as any;
        for (const { method, path } of routes) {
            if (endpoints[path]) {
                endpoints[path][method.toLowerCase()] = {
                    "summary": "API Documentation",
                    "responses": {
                        "200": {
                            "description": "Okay"
                        },
                        "404": {
                            "description": "Not Found"
                        },
                        "500": {
                            "description": "Server Error"
                        }
                    }
                }
            } else {
                endpoints[path] = {
                    [method.toLowerCase()]: {
                        "summary": "API Documentation",
                        "responses": {
                            "200": {
                                "description": "Okay"
                            },
                            "404": {
                                "description": "Not Found"
                            },
                            "500": {
                                "description": "Server Error"
                            }
                        }
                    }
                }
            }
        }

        // Create Swagger Config Files
        await fs.writeFile(path.join(docsFolder, "routes", filename + ".json"), JSON.stringify(endpoints), 'utf-8');

    }
}



export async function updateGitignore(shouldGitignore: boolean, __dirname: string, configDocsFolder: string) {
    // Update .gitignore if necessary
    try {
        const gitignore = await fs.readFile(path.join(__dirname, '.gitignore'), 'utf-8');
        const filesHaveNotBeenIgnored = !(gitignore.includes(configDocsFolder) && gitignore.includes(CONSTANTS.config_file));
        if (filesHaveNotBeenIgnored && shouldGitignore) {
            const additions = `\n\n# Ignore Swagme Files\n/docs\n${CONSTANTS.config_file}\n`;
            await fs.appendFile(path.join(__dirname, '.gitignore'), additions, 'utf-8');
        }
    } catch (e) {
        if (e instanceof Error) {
            if (!e.message.includes("EXIST") && !e.message.includes("file already exists")) {
                console.warn(chalk.yellow('Could not find .gitignore file'));
            }
        }
    }

}