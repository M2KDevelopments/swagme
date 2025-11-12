#!/usr/bin/env node

// CLI Libraries
import figlet from 'figlet';
import chalk from 'chalk';
import { program } from "commander";
import inquirer from "inquirer";
import { getProjectPrompts } from './helpers/prompts';
import { CONSTANTS } from './helpers/constants';

// Node Libs for paths and files
import path from 'path';
import fs from 'fs/promises';


import { generateSwaggerFiles, createDocsFolder, generateSwagmeRouteFiles, generateSwagmeSchemaFiles, updateGitignore } from './helpers/creatingfiles';
import { generateREADME } from './helpers/readme';

// Reading config files
import { readPackageJSON, readConfigJSON, detectMainExpressFile, detectORM, getSchemaPathFromConfigFile, detectProjectType } from './helpers/readingfiles';

// Reading Schema Files and Endpoints
import { getMongooseSchemaFromFile } from './database/mongoose';
import { getPrismaSchemaFromFile as getPrismaSchemaFromFile } from './database/prisma';
import { getDrizzleSchemaFromFile } from './database/drizzle';
import { getSwaggerInfoFromExpressRoutes, getSwaggerInfoFromNextJSRouter } from './helpers/readendpoints';


// Interfaces 
import { ISwagmeSchema } from './interfaces/swagme.schema';
import { ISwagmeRoute } from './interfaces/swagme.route';
import { ISwaggerConfig } from './interfaces/swagme.config';
import SwagmePackageJson from '../package.json'

interface BuildOptions {
    json: boolean,
    yaml: boolean,
    schemas: boolean,
    routes: boolean,
    scanProjectFiles: boolean
}


async function run(congigure: boolean, askForDetails: boolean, build: boolean, pathdir: string, buildOptions: BuildOptions) {

    const __currentWorkingDir = pathdir || process.cwd()

    // Read package.json
    const { json: package_json, error } = await readPackageJSON(__currentWorkingDir);
    const config_json = await readConfigJSON(__currentWorkingDir);
    if (error) return console.error(chalk.redBright(error));

    // Dependency Check
    if (!package_json || !package_json.dependencies) return console.error(chalk.redBright('Dependencies not found'));

    // Get Project Type
    const projectType = await detectProjectType(__currentWorkingDir, package_json);

    // Lib Dependency Check
    if (projectType == 'express' && !package_json.dependencies.express) console.error(chalk.yellowBright('Express JS Dependency not found'), chalk.yellow(`run: 'npm i express'`));
    else if (projectType == 'nextjs' && !package_json.dependencies.next) console.error(chalk.yellowBright('Next JS Dependency not found'));


    // Swagger Dependency Check
    if (!package_json.dependencies || !package_json.dependencies['swagger-ui-express']) {
        console.warn(
            chalk.yellow('We recommend installing "swagger-ui-express". Run:'),
            chalk.green('npm install swagger-ui-express')
        )
    }

    // Detect ORM, prisma, drizzle or NONE
    const orm = await detectORM(__currentWorkingDir)


    let mainRouteFile: string = '';
    switch (projectType) {
        case "express":
            // Auto scan for main file with 'app.use('/')' phrase
            mainRouteFile = await detectMainExpressFile(__currentWorkingDir);
            break;
        case "nextjs":
            mainRouteFile = '/pages/api'
            break;
    }


    // Check for config file data
    if (config_json && config_json.name) console.log('Swagme config file detected', chalk.green(CONSTANTS.config_file));
    else if (orm) console.log(chalk.yellow(`ORM Detected:`), chalk.yellowBright(orm));



    // Get schema path
    const schemaDefaultPath = orm ? await getSchemaPathFromConfigFile(__currentWorkingDir, orm) : '';

    // Get Project answers
    const prompts = getProjectPrompts({ mainRouteFile, config_json, package_json, schemaDefaultPath, orm, projectType });
    const answersForProject = !askForDetails ? config_json : (await inquirer.prompt(prompts)) as ISwaggerConfig;


    // Validation Checks
    if (!answersForProject.name && answersForProject.name.trim()) return console.error(chalk.redBright(`Please make sure you enter the name`))
    if (!answersForProject.routes && answersForProject.routes.trim()) return console.error(chalk.redBright(`Please make sure you enter the routes folder`))



    // Mongoose Dependency Check
    if (!package_json.dependencies.mongoose && answersForProject.database == 'mongoose') {
        console.error(
            chalk.yellow('Could not find "mongoose" in your project\'s package.json file. Run:'),
            chalk.yellowBright('npm install mongoose')
        )
    }

    // Create Swagger Config Files
    if (congigure) {
        await fs.writeFile(
            path.join(__currentWorkingDir, CONSTANTS.config_file),  // file path
            JSON.stringify(answersForProject),  // answers of from user
            'utf-8' //encoding
        );
    }

    if (build) {

        // Get Schema Files List
        const schemaFiles = [];
        const routesFiles = [];

        if (answersForProject.database == 'mongoose' && answersForProject.schema) {
            try {
                const list = await fs.readdir(path.join(__currentWorkingDir, answersForProject.schema));
                schemaFiles.push(...list);
            } catch (e) {
                return console.error(
                    chalk.red('Schema folder was not found:'),
                    chalk.redBright(path.join(__currentWorkingDir, answersForProject.schema))
                );
            }
        } else if (answersForProject.database == 'prisma' && answersForProject.schema) {
            if (answersForProject.schema.endsWith('.prisma')) { // if it a files
                schemaFiles.push(answersForProject.schema);
            } else { // show be a folder
                try {
                    const list = await fs.readdir(path.join(__currentWorkingDir, answersForProject.schema));
                    for (const fileOrFolder of list) {

                        // ignore migrations folders
                        if (fileOrFolder == 'migrations') continue;

                        // has the '.prisma' file extension
                        else if (fileOrFolder.endsWith('.prisma')) schemaFiles.push(fileOrFolder);

                        // no file extension. assume folder/directory
                        else if (!fileOrFolder.includes(".")) {
                            const innerfiles = await fs.readdir(path.join(__currentWorkingDir, answersForProject.schema, fileOrFolder));
                            for (const file of innerfiles) {
                                if (file.endsWith('.prisma')) schemaFiles.push(`${fileOrFolder}/${file}`);
                            }
                        }
                    }
                } catch (e) {
                    return console.error(
                        chalk.red('Schema folder was not found:'),
                        chalk.redBright(path.join(__currentWorkingDir, answersForProject.schema))
                    );
                }
            }
        } else if (answersForProject.database == 'drizzle' && answersForProject.schema) {
            if (answersForProject.schema.includes("*")) { //includes a wildcard
                const folder = answersForProject.schema.substring(0, answersForProject.schema.indexOf("*"));
                try {
                    const list = await fs.readdir(path.join(__currentWorkingDir, folder));
                    schemaFiles.push(...list
                        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
                        .map(file => `${folder}/${file}`)
                    );
                } catch (e) {
                    return console.error(
                        chalk.red('Schema folder was not found:'),
                        chalk.redBright(path.join(__currentWorkingDir, answersForProject.schema))
                    );
                }
            } else if (answersForProject.schema.endsWith(".ts") || answersForProject.schema.endsWith(".js")) {
                schemaFiles.push(answersForProject.schema);
            }
        }

        // Get Route Files List
        try {
            const list = await fs.readdir(path.join(__currentWorkingDir, answersForProject.routes));
            routesFiles.push(...list);
        } catch (e) {
            return console.error(
                chalk.red('Routes folder was not found:'),
                chalk.redBright(path.join(__currentWorkingDir, answersForProject.routes))
            );
        }


        // read schemas and models
        const swaggerSchemas = [] as Array<ISwagmeSchema>;
        if (schemaFiles.length && buildOptions.schemas && buildOptions.scanProjectFiles) {
            const list = schemaFiles
            const foldername = answersForProject.schema;
            switch (answersForProject.database) {
                case "mongoose":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__currentWorkingDir, foldername, filename), 'utf8')
                        const schemas = getMongooseSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                case "prisma":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__currentWorkingDir, foldername, filename), 'utf8')
                        const schemas = getPrismaSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                case "drizzle":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__currentWorkingDir, foldername, filename), 'utf8')
                        const schemas = getDrizzleSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                default: break;
            }
        }



        // reads routes from files
        let swaggerRoutes: Array<ISwagmeRoute> = []
        if (projectType == 'express') {
            swaggerRoutes = buildOptions.scanProjectFiles && buildOptions.routes ? await getSwaggerInfoFromExpressRoutes(__currentWorkingDir, {
                mainFilePath: answersForProject.main,
                routeFolder: answersForProject.routes,
                routesFileNames: routesFiles,
            }) : [];
        } else if (projectType == 'nextjs') {
            swaggerRoutes = buildOptions.scanProjectFiles && buildOptions.routes ? await getSwaggerInfoFromNextJSRouter(__currentWorkingDir, answersForProject.routes)
                : [];
        }


        /* *******************************************
        *
        *    Generate swagme files in folder
        *
        * *******************************************/

        // 1. Create Directories
        const docsFolder = path.join(__currentWorkingDir, answersForProject.docs);
        const { error: docsErr } = await createDocsFolder(docsFolder)
        if (docsErr) return; // Stop Process

        // 2. Create a READ Me file for ignorant developers
        await generateREADME(docsFolder)

        // 3. Generate schema files
        if (buildOptions.schemas && buildOptions.scanProjectFiles) await generateSwagmeSchemaFiles(docsFolder, swaggerSchemas, buildOptions.json, buildOptions.yaml);

        // 4. Generate route files
        if (buildOptions.routes && buildOptions.scanProjectFiles) await generateSwagmeRouteFiles(docsFolder, swaggerRoutes, answersForProject.authorization, buildOptions.json, buildOptions.yaml);

        // 5. Update .gitignore if necessary
        await updateGitignore(answersForProject.gitignore, __currentWorkingDir, answersForProject.docs);

        // 6. Generate Swagger Json and/or Yaml files
        if (config_json && config_json.name && (buildOptions.json || buildOptions.yaml)) {
            await generateSwaggerFiles(config_json, __currentWorkingDir, buildOptions.json, buildOptions.yaml);
        }
    }



    // 7. Done with swagme
    console.log(chalk.blueBright(`${answersForProject.name} (${answersForProject.version})`), "has been", chalk.yellowBright('Swagged!'))


}

// Initialization
program
    .version(SwagmePackageJson.version)
    .description(SwagmePackageJson.description)
    .action(() => {
        const congigure = true, askForDetails = true, build = true;
        run(congigure, askForDetails, build, process.cwd(), {
            json: true,
            yaml: true,
            scanProjectFiles: true,
            routes: true,
            schemas: true
        });
    })

// Configure Command
program.command('run')
    .description(SwagmePackageJson.description)
    .argument('[string]', 'Working direction of the project', process.cwd())
    .option('-y, --auto', 'Auto configure and build swagger documentation', false)
    .option('-c, --config', 'Auto configure swagger documentation', false)
    .option('-b, --build', 'Build the swagger files for the Swagger UI', false)
    .option('-r, --routes', 'Update routes', true)
    .option('-s, --schemas', 'Update schemas', true)
    .option('--scan', 'Scan Project files', false)
    .option('--json', 'Just build the swagger.json file (This works with the --build flag)', false)
    .option('--yaml', 'Just build the swagger.yml file (This works with the --build flag)', false)
    .action((folderpath, options) => {
        // config files
        const congigure = !options.config && !options.build || options.config;
        const build = !options.config && !options.build || options.build;
        const askForDetails = !options.auto;
        // build files
        const json = !options.json && !options.yaml || options.json;
        const yaml = !options.json && !options.yaml || options.yaml;
        run(congigure, askForDetails, build, folderpath, {
            json, yaml,
            scanProjectFiles: options.scan,
            routes: options.routes,
            schemas: options.schemas
        });
    });

// Configure Command
program.command('config')
    .description('Generates swagme configuration files and folders')
    .option('-y, --auto', 'Auto configure and build swagger documentation', false)
    .option('-p, --dir', 'Project director/folder', process.cwd())
    .action((options) => {
        const congigure = true;
        const askForDetails = !options.auto
        const build = false;
        run(congigure, askForDetails, build, options.dir, {
            json: false,
            yaml: false,
            scanProjectFiles: false,
            routes: false,
            schemas: false
        });
    });

// Build Command
program.command('build')
    .description('Generates swagger documentation for express js projects')
    .option('-p, --dir', 'Project director/folder', process.cwd())
    .option('--json', 'Just build the swagger.json file (This works with the --build flag)', false)
    .option('--yaml', 'Just build the swagger.yml file (This works with the --build flag)', false)
    .option('-r, --routes', 'Update routes', true)
    .option('-s, --schemas', 'Update schemas', true)
    .option('--scan', 'Scan Project files', false)
    .action((options) => {
        const congigure = false, askForDetails = false, build = true;
        // build files
        const json = !options.json && !options.yaml || options.json;
        const yaml = !options.json && !options.yaml || options.yaml;
        run(congigure, askForDetails, build, options.dir, {
            json, yaml,
            scanProjectFiles: options.scan,
            routes: options.routes,
            schemas: options.schemas
        });
    });

// Delete Command
program.command('del')
    .description('Removes all the swagme configuration files and folders')
    .option('-p, --dir', 'Project director/folder', process.cwd())
    .option('-y, --auto', 'Auto delete all swagme files and folders', false)
    .action(async (options) => {
        const __currentWorkingDir = options.dir;

        // Read package.json 
        const config_json = await readConfigJSON(__currentWorkingDir);
        if (!(config_json && config_json.name)) return console.error(chalk.redBright('Could not find config file'), chalk.red(CONSTANTS.config_file))

        let doit = !options.auto
        if (!options.auto) {
            const question = [
                {
                    "type": "list",
                    "name": "confirm",
                    "message": "Are you sure you want to delete swagme files and folders?",
                    "choices": ['yes', 'no'],
                    "default": "no"
                }
            ] as Array<any>;
            const response = (await inquirer.prompt(question)) as { confirm: string }
            doit = response.confirm == 'yes'
        }

        if (doit) {

            // Remove docs folder 
            const docsFolder = path.join(__currentWorkingDir, config_json.docs);
            try {
                await fs.rm(docsFolder, { recursive: true, force: true })
                console.log(chalk.green(docsFolder), 'has been removed')
            } catch (e: any) {
                console.error(chalk.red(e.message));
                console.warn(chalk.yellow('Could not find swagme folder:'), docsFolder)
            }


            // Remove config file
            const configPath = path.join(__currentWorkingDir, CONSTANTS.config_file);
            try {
                await fs.unlink(configPath)
                console.log(chalk.green(CONSTANTS.config_file), 'has been removed')
            } catch (e) {
                console.warn(chalk.yellow('Could not find config file:'), configPath)
            }

            console.log(chalk.greenBright(config_json.name + ` (${config_json.version})`), chalk.blue('has been De-Swagged!'))
        }
    });

// Show Title
console.log(chalk.yellow(figlet.textSync("Swagme", { horizontalLayout: "full" })));
console.log(chalk.yellowBright('Auto Swagger Documentation'), 'Let\'s Get Started!');



program.parse(process.argv);
