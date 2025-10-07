#!/usr/bin/env node
import figlet from 'figlet';
import chalk from 'chalk';
import { program } from "commander";
import inquirer from "inquirer";
import path from 'path';
import fs from 'fs/promises';
import { generateSwaggerFiles, createDocsFolder, generateSwagmeRouteFiles, generateSwagmeSchemaFiles, updateGitignore } from './helpers/creatingfiles';
import { readPackageJSON, readConfigJSON, detectMainExpressFile } from './helpers/readingfiles';
import { CONSTANTS } from './helpers/constants';
import { getFilePathPrompts, getProjectPrompts } from './helpers/prompts';
import { ISwagmeSchema } from './interfaces/swagme.schema';
import { ISwagmeRoute } from './interfaces/swagme.route';
import { getMongooseSchemaFromFile } from './database/mongoose';
import { getPrimsaSchemaFromFile } from './database/primsa';
import { getDrizzleSchemaFromFile } from './database/drizzle';
import { getSwaggerInfoFromExpressRoutes } from './helpers/readendpoints';
import { generateREADME } from './helpers/readme';
import { ISwaggerConfig } from './interfaces/swagme.config';

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

    // Express dependency
    if (!package_json || !package_json.dependencies || !package_json.dependencies.express) {
        return console.error(
            chalk.yellow('express'),
            chalk.redBright('dependency not found. Run:'),
            chalk.yellow('npm install express')
        );
    }

    // Swagger Dependency Check
    if (!package_json.dependencies || !package_json.dependencies['swagger-ui-express']) {
        console.warn(
            chalk.yellow('We recommend installing "swagger-ui-express". Run:'),
            chalk.green('npm install swagger-ui-express')
        )
    }

    // Auto scan for main file with 'app.use('/')' phrase
    const mainRouteFile = await detectMainExpressFile(__currentWorkingDir);

    // Check for config file data
    if (config_json && config_json.name) console.log('Swagme config file detected', chalk.green(CONSTANTS.config_file));



    // Get Project answers
    const prompts = getProjectPrompts(mainRouteFile, config_json, package_json);
    const answersProject = !askForDetails ? config_json : (await inquirer.prompt(prompts)) as ISwaggerConfig;


    // Validation Checks
    if (!answersProject.name && answersProject.name.trim()) return console.error(chalk.redBright(`Please make sure you enter the name`))
    if (!answersProject.routes && answersProject.routes.trim()) return console.error(chalk.redBright(`Please make sure you enter the routes folder`))



    // Mongoose Dependency Check
    if (!package_json.dependencies.mongoose && answersProject.database == 'mongoose') {
        return console.error(
            chalk.yellow('Could not find "mongoose" in your project\'s package.json file. Run:'),
            chalk.green('npm install mongoose')
        )
    }

    // Create Swagger Config Files
    if (congigure) {
        await fs.writeFile(path.join(__currentWorkingDir, CONSTANTS.config_file), JSON.stringify(answersProject), 'utf-8');
    }

    if (build) {

        // Get Schema Files List
        const schemaFiles = [];
        const routesFiles = [];


        if (answersProject.schema) {
            try {
                const list = await fs.readdir(path.join(__currentWorkingDir, answersProject.schema));
                schemaFiles.push(...list);
            } catch (e) {
                return console.error(
                    chalk.red('Schema folder was not found:'),
                    chalk.redBright(path.join(__currentWorkingDir, answersProject.schema))
                );
            }
        }




        // Get Route Files List
        try {
            const list = await fs.readdir(path.join(__currentWorkingDir, answersProject.routes));
            routesFiles.push(...list);
        } catch (e) {
            return console.error(
                chalk.red('Routes folder was not found:'),
                chalk.redBright(path.join(__currentWorkingDir, answersProject.routes))
            );
        }



        // Routes and Schema files
        const promptFileAndFolders = getFilePathPrompts(schemaFiles, routesFiles);




        // Get answers for files
        const answersForFiles = !askForDetails ? { routefiles: ['SELECT ALL'], schemafiles: ['SELECT ALL'] } : await inquirer.prompt(promptFileAndFolders) as { routefiles: Array<string>, schemafiles: Array<string> };




        // read schemas and models
        const swaggerSchemas = [] as Array<ISwagmeSchema>;
        if (schemaFiles.length && buildOptions.schemas && buildOptions.scanProjectFiles) {
            const list = answersForFiles.schemafiles.includes("SELECT ALL") ? schemaFiles : answersForFiles.schemafiles
            const foldername = answersProject.schema;
            switch (answersProject.database) {
                case "mongoose":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__currentWorkingDir, foldername, filename), 'utf8')
                        const schemas = getMongooseSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                case "primsa":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__currentWorkingDir, foldername, filename), 'utf8')
                        const schemas = getPrimsaSchemaFromFile(filename, file);
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
        const swaggerRoutes: Array<ISwagmeRoute> = buildOptions.scanProjectFiles && buildOptions.routes ? await getSwaggerInfoFromExpressRoutes(__currentWorkingDir, answersProject.routes, answersProject.main, routesFiles) : [];




        /* *******************************************
        *
        *    Generate swagme files in folder
        *
        * *******************************************/

        // 1. Create Directories
        const docsFolder = path.join(__currentWorkingDir, answersProject.docs);
        const { error: docsErr } = await createDocsFolder(docsFolder)
        if (docsErr) return; // Stop Process

        // 2. Create a READ Me file for ignorant developers
        await generateREADME(docsFolder)

        // 3. Generate schema files
        if (buildOptions.schemas && buildOptions.scanProjectFiles) await generateSwagmeSchemaFiles(docsFolder, swaggerSchemas);

        // 4. Generate route files
        if (buildOptions.routes && buildOptions.scanProjectFiles) await generateSwagmeRouteFiles(docsFolder, swaggerRoutes, answersProject.authorization);

        // 5. Update .gitignore if necessary
        await updateGitignore(answersProject.gitignore, __currentWorkingDir, answersProject.docs);

        // 6. Generate Swagger Json and/or Yaml files
        if (config_json && config_json.name && (buildOptions.json || buildOptions.yaml)) {
            await generateSwaggerFiles(config_json, __currentWorkingDir, buildOptions.json, buildOptions.yaml);
        }
    }



    // 7. Done with swagme
    console.log(chalk.blueBright(`${answersProject.name} (${answersProject.version})`), "has been", chalk.yellowBright('Swagged!'))


}

// Initialization
program
    .version("1.0.0")
    .description("Node Js CLI tool that auto generates swagger api documentation for express web servers. Takes advantage of the MVC Pattern")
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
    .description("Node Js CLI tool that auto generates swagger api documentation for express web servers. Takes advantage of the MVC Pattern.")
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
    .action((_, options) => {
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
    .action((_, options) => {
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
    .action((_, options) => {
        console.log('Delete Command');
    });

// Show Title
console.log(chalk.yellow(figlet.textSync("Swagme", { horizontalLayout: "full" })));
console.log(chalk.yellowBright('Auto Swagger Documentation'), 'Let\'s Get Started!');



program.parse(process.argv);
