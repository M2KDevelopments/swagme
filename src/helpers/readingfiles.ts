import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { IPackageJSON } from '../interfaces/package.json.ts';
import { ISwaggerConfig } from '../interfaces/swagme.config.ts';
import { CONSTANTS } from './constants.ts';

export async function readPackageJSON(__dirname: string): Promise<{ json: IPackageJSON | null, error: string | null | any }> {
    try {
        const package_json = await fs.readFile(path.join(__dirname, 'package.json'), 'utf8');
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


export async function readConfigJSON(__dirname: string): Promise<ISwaggerConfig | { name: null }> {
    try {
        const config_json = await fs.readFile(path.join(__dirname, CONSTANTS.config_file), 'utf8');
        return JSON.parse(config_json) as ISwaggerConfig;
    } catch (e) {
        return { name: null };
    }
}

export async function detectMainExpressFile(__dirname: string) {
    const mainFiles = await fs.readdir(path.join(__dirname));
    let mainRouteFile = "/src/index.js";
    for (const mainfile of mainFiles) {

        if ((mainfile.lastIndexOf(".ts") == (mainfile.length - ".ts".length)) || (mainfile.lastIndexOf(".js") == (mainfile.length - ".js".length))) {
            const file = await fs.readFile(path.join(__dirname, mainfile), 'utf-8');
            if (file.includes(".use(/")) {
                console.log('Main route file detected as', chalk.green(mainfile));
                mainRouteFile = `/${mainfile}`;
                break;
            }
        }
    }
    return mainRouteFile;
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
