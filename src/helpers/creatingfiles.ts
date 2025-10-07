import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { ISwagmeRoute } from '../interfaces/swagme.route';
import { ISwagmeSchema } from '../interfaces/swagme.schema';
import { ISwaggerConfig } from '../interfaces/swagme.config';
import { CONSTANTS } from './constants';
import YAML from 'json-to-pretty-yaml';

/**
 * Generates swagger.json and swagger.yaml files based on the config.json and docs folder contents
 * https://swagger.io/docs/specification/v2_0/basic-structure/
 * @param {ISwaggerConfig} config_json - Swagme config file contents
 * @param {string} __currentWorkingDir - Current working directory
 * @param {boolean} [json=true] - Generate swagger.json file
 * @param {boolean} [yaml=true] - Generate swagger.yaml file
 * @returns {Promise<void>} - Resolves when the files have been generated
 */

export async function generateSwaggerFiles(config_json: ISwaggerConfig, __currentWorkingDir: string, json: boolean = true, yaml: boolean = true) {

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
            swagger_json['security'] = [
                {
                    "bearerAuth": []
                }
            ]
        } else if (config_json.authorization == 'basic') {
            swagger_json.components['securitySchemes'] = {
                "basicAuth": {
                    "type": "http",
                    "scheme": "basic",
                    "description": "Enter your basic auth credentials",
                }
            }
            swagger_json['security'] = [
                {
                    "basicAuth": []
                }
            ]
        }


        const schemas = await fs.readdir(path.join(__currentWorkingDir, config_json.docs, 'schemas'));
        const routes = await fs.readdir(path.join(__currentWorkingDir, config_json.docs, 'routes'));

        for (const filename of schemas) {
            if (!filename.includes(".json")) continue;
            const file = await fs.readFile(path.join(__currentWorkingDir, config_json.docs, 'schemas', filename), 'utf-8');
            const json = JSON.parse(file);
            swagger_json.components.schemas = { ...swagger_json.components.schemas, ...json }
        }

        for (const filename of routes) {
            if (!filename.includes(".json")) continue;
            const file = await fs.readFile(path.join(__currentWorkingDir, config_json.docs, 'routes', filename), 'utf-8');
            const json = JSON.parse(file);
            swagger_json.paths = { ...swagger_json.paths, ...json }
        }

        // Generate swagger.json and swagger.yaml file
        if (json) await fs.writeFile(path.join(__currentWorkingDir, 'swagger.json'), JSON.stringify(swagger_json), 'utf-8');
        if (yaml) await fs.writeFile(path.join(__currentWorkingDir, 'swagger.yml'), YAML.stringify(swagger_json), 'utf-8');

        if (json) console.log(chalk.green('swagger.json'), chalk.greenBright('file generated'));
        if (yaml) console.log(chalk.green('swagger.yml'), chalk.greenBright('file generated'));
    } catch (e) {
        console.error(chalk.red(e))
    }

}


/**
 * Creates a docs folder with 'schemas' and 'routes' subfolders.
 * If the folder already exists, it will not be recreated.
 * If there is an error creating the folder or subfolders, an error message will be logged.
 * @param {string} docsFolder - The path where the docs folder will be created.
 * @returns {Promise<{ error: boolean }>}
 * @fulfill {error: boolean} - Returns an object with an error property set to true if there was an error creating the folder or subfolders.
 */
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


/**
 * Generates swagger schema files for express web server
 * @param {string} docsFolder - path to the folder where swagger schema files will be generated
 * @param {Array<ISwagmeSchema>} swaggerSchemas - array of swagger schema files
 * @returns {Promise<void>} - promise that resolves when all files have been generated
 */
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

        console.log('Model Added:', chalk.greenBright(tablename));
    }
}

/**
 * Generates swagger route files for express web server
 * @param {string} docsFolder - path to the folder where swagger files will be generated
 * @param {Array<ISwagmeRoute>} swaggerRoutes - array of swagger routes
 * @returns {Promise<void>} - promise that resolves when all files have been generated
 */
export async function generateSwagmeRouteFiles(docsFolder: string, swaggerRoutes: Array<ISwagmeRoute>, securityType: 'bearer' | 'basic' | 'none' = 'none') {
    const security = { security: [] as Array<any> };
    if (securityType == 'bearer') security.security.push({ bearerAuth: [] });
    else if (securityType == 'basic') security.security.push({ basicAuth: [] });

    for (const { baseroute, filename, routes, tagname } of swaggerRoutes) {

        console.log('Added:', chalk.greenBright(baseroute));

        // Configure swagger endpoints
        const endpoints = {} as any;
        for (const { method, path } of routes) {
            if (endpoints[baseroute + path]) {
                endpoints[baseroute + path][method.toLowerCase()] = {
                    "summary": "API Documentation",
                    "produces": ["application/json"],
                    "tags": [tagname],
                    ...security,
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
                endpoints[baseroute + path] = {
                    [method.toLowerCase()]: {
                        "summary": "API Documentation",
                        "produces": ["application/json"],
                        "tags": [tagname],
                        ...security,
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



/**
 * Updates .gitignore if necessary
 * @param {boolean} shouldGitignore - whether to update .gitignore or not
 * @param {string} __currentWorkingDir - path to the current working directory
 * @param {string} configDocsFolder - path to the folder where swagger config files are located
 * @returns {Promise<void>} - promise that resolves when .gitignore has been updated or not
 */
export async function updateGitignore(shouldGitignore: boolean, __currentWorkingDir: string, configDocsFolder: string) {
    // Update .gitignore if necessary
    try {
        const gitignore = await fs.readFile(path.join(__currentWorkingDir, '.gitignore'), 'utf-8');
        const filesHaveNotBeenIgnored = !(gitignore.includes(configDocsFolder) && gitignore.includes(CONSTANTS.config_file));
        if (filesHaveNotBeenIgnored && shouldGitignore) {
            const additions = `\n\n# Ignore Swagme Files\n/docs\n${CONSTANTS.config_file}\n`;
            await fs.appendFile(path.join(__currentWorkingDir, '.gitignore'), additions, 'utf-8');
        }
    } catch (e) {
        if (e instanceof Error) {
            if (!e.message.includes("EXIST") && !e.message.includes("file already exists")) {
                console.warn(chalk.yellow('Could not find .gitignore file'));
            }
        }
    }

}