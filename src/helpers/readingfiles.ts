import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { IPackageJSON } from '../interfaces/package.json';
import { ISwaggerConfig } from '../interfaces/swagme.config';
import { CONSTANTS } from './constants';

export async function readPackageJSON(__currentWorkingDir: string): Promise<{ json: IPackageJSON | null, error: string | null | any }> {
    try {
 
        const package_json = await fs.readFile(path.join(__currentWorkingDir, 'package.json'), 'utf8');
        return { json: JSON.parse(package_json) as IPackageJSON, error: null }
    } catch (e) {
        if (e instanceof Error) {
            if (e.message.includes("no such file or directory")) {
                return { error: 'Could not find the package.json file', json: null };
            } else return { error: e.message, json: null };
        } else {
            console.error('Unexpected error', e);
            return { error: e, json: null };
        }
    }
}


export async function readConfigJSON(__currentWorkingDir: string): Promise<ISwaggerConfig> {
    try {
        const config_json = await fs.readFile(path.join(__currentWorkingDir, CONSTANTS.config_file), 'utf8');
        return JSON.parse(config_json) as ISwaggerConfig;
    } catch (e) {
        return {
            name: '',
            version: '',
            description: '',
            authorization: undefined,
            baseurl: '',
            main: '',
            database: 'unknown',
            schema: '',
            routes: '',
            docs: '',
            gitignore: false
        };
    }
}

export async function detectMainExpressFile(__currentWorkingDir: string) {
    const mainFiles = await fs.readdir(path.join(__currentWorkingDir));
    let mainRouteFile = "/src/index.js";
    for (const mainfile of mainFiles) {

        if ((mainfile.lastIndexOf(".ts") == (mainfile.length - ".ts".length)) || (mainfile.lastIndexOf(".js") == (mainfile.length - ".js".length))) {
            const file = await fs.readFile(path.join(__currentWorkingDir, mainfile), 'utf-8');
            if (file.includes(".use(/")) {
                console.log('Main route file detected as', chalk.green(mainfile));
                mainRouteFile = `/${mainfile}`;
                break;
            }
        }
    }
    return mainRouteFile;
}

export async function getSchemaPathFromConfigFile(__currentWorkingDir: string, orm: string) {
    let file: string | null = null;
    try {
        file = await fs.readFile(path.join(__currentWorkingDir, `${orm}.config.ts`), 'utf-8');
    } catch (e) {
        try {
            file = await fs.readFile(path.join(__currentWorkingDir, `${orm}.config.js`), 'utf-8');
        } catch (e) {
            console.warn(chalk.redBright('Could not read config file for'), chalk.red(orm));
        }
    }

    // if file not found
    if (!file) return "/models";

    // if schema match not found
    const schemaPathMatch = file.match(/(?<=schema)(.*)(?=,)/gm);
    if (!schemaPathMatch) return "/models";


    // read path from config file
    return schemaPathMatch[0]
        .replace(":", '')
        .replace('"', "")
        .replace('"', "")
        .replace('./', "")
        .trim()
}

/**
 * Detects which ORM (Object Relational Mapping) tool is being used in the project
 * @param __currentWorkingDir - The current working directory of the project
 * @returns A string indicating which ORM tool is being used, or an empty string if none is detected
 */
export async function detectORM(__currentWorkingDir: string): Promise<"prisma" | "drizzle" | ""> {
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'prisma.config.ts'));
        return "prisma";
    } catch (e) { }
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'prisma.config.js'));
        return "prisma";
    } catch (e) { }
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'drizzle.config.ts'));
        return "drizzle";
    } catch (e) { }
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'drizzle.config.js'));
        return "drizzle";
    } catch (e) { }
    return "";
}



export async function detectProjectType(__currentWorkingDir: string, packagejson: IPackageJSON): Promise<"nextjs" | "express" | null> {
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'next.config.mjs'));
        return 'nextjs';
    } catch (e) { }
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'next.config.js'));
        return 'nextjs';
    } catch (e) { }
    try {
        await fs.lstat(path.join(__currentWorkingDir, 'next.config.ts'));
        return 'nextjs';
    } catch (e) { }
    if (packagejson.dependencies.express) return "express";
    return null;
}

export function getSwaggerYAMLFrom(filetext: string) {
    let start = 0;

    const yml = [];
    const lines = filetext.split("\n");

    for (const i in lines) {
        const line = lines[i];
        if (line.includes("@swagger")) {
            // start the check
            start = parseInt(i);
        } else if (start && line.includes("*/")) {
            const end = parseInt(i);
            let text = ``;
            for (let j = start; j <= end; j++) {
                text += lines[j]
                    .replace("@swagger", "")
                    .replace("*/", "")
                    .replace("*", "") + "\n";
            }
            yml.push(text); // add yml text into array
            start = 0;
        }

    }
    return yml;
}
