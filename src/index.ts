import figlet from 'figlet';
import chalk from 'chalk';
import { program } from "commander";
import inquirer from "inquirer";
import path, { dirname } from 'path';
import fs from 'fs/promises';
import { generateSwaggerJson, createDocsFolder, generateSwagifyRouteFiles, generateSwagifySchemaFiles, updateGitignore } from './helpers/creatingfiles';
import { readPackageJSON, readConfigJSON, detectMainExpressFile } from './helpers/readingfiles';
import { CONSTANTS } from './helpers/constants';
import { getFilePathPrompts, getProjectPrompts } from './helpers/prompts';
import { ISwagifySchema } from './interfaces/swagify.schema';
import { ISwagifyRoute } from './interfaces/swagify.route';

// Get base directory - https://dev.to/adrvnc/how-to-resolve-the-dirname-is-not-defined-in-es-module-scope-error-in-javascript-584
import { fileURLToPath } from 'url';
import { getMongooseSchemaFromFile } from './database/mongoose';
import { getPrimsaSchemaFromFile } from './database/primsa';
import { getDrizzleSchemaFromFile } from './database/drizzle';
import { getSwaggerInfoFromExpressRoutes } from './helpers/readendpoints';
import { generateREADME } from './helpers/readme';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialization
program
    .version("1.0.0")
    .description("Node Js CLI tool that auto generates swagger api documentation for express web servers. Takes advantage of the MVC Pattern");



// Show Title
console.log(chalk.yellow(figlet.textSync("Swagify", { horizontalLayout: "full" })));
console.log(chalk.yellowBright('Auto Swagger Documentation'), 'Let\'s Get Started!');


async function init() {

    // Read package.json
    const { json: package_json, error } = await readPackageJSON(__dirname);
    const config_json = await readConfigJSON(__dirname);
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
    const mainRouteFile = await detectMainExpressFile(__dirname);

    // Check for config file data
    if (config_json && config_json.name) console.log('Swagify config file detected', chalk.green(CONSTANTS.config_file));

    // process actions
    program.action(async () => {


        // Get Project answers
        const prompts = getProjectPrompts(mainRouteFile, config_json, package_json);
        const answersProject = await inquirer.prompt(prompts);


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




        // Get Schema Files List
        const schemaFiles = [];
        const routesFiles = [];


        if (answersProject.schema) {
            try {
                const list = await fs.readdir(path.join(__dirname, answersProject.schema));
                schemaFiles.push(...list);
            } catch (e) {
                return console.error(
                    chalk.red('Schema folder was not found:'),
                    chalk.redBright(path.join(__dirname, answersProject.schema))
                );
            }
        }




        // Get Route Files List
        try {
            const list = await fs.readdir(path.join(__dirname, answersProject.routes));
            routesFiles.push(...list);
        } catch (e) {
            return console.error(
                chalk.red('Routes folder was not found:'),
                chalk.redBright(path.join(__dirname, answersProject.routes))
            );
        }



        // Routes and Schema files
        const promptFileAndFolders = getFilePathPrompts(schemaFiles, routesFiles);




        // Get answers for files
        const answersForFiles = await inquirer.prompt(promptFileAndFolders);




        // read schemas and models
        const swaggerSchemas = [] as Array<ISwagifySchema>;
        if (schemaFiles.length) {
            const list = answersForFiles.schemafiles.includes("SELECT ALL") ? schemaFiles : answersForFiles.schemafiles
            const foldername = answersProject.schema;
            switch (answersProject.database) {
                case "mongoose":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                        const schemas = getMongooseSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                case "primsa":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                        const schemas = getPrimsaSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                case "drizzle":
                    for (const filename of list) {
                        const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                        const schemas = getDrizzleSchemaFromFile(filename, file);
                        swaggerSchemas.push(...schemas);
                    }
                    break;
                default: break;
            }
        }



        // reads routes from files
        const swaggerRoutes: Array<ISwagifyRoute> = await getSwaggerInfoFromExpressRoutes(__dirname, answersProject.routes, answersProject.main, routesFiles);




        /* *******************************************
        *
        *    Generate swagify files in folder
        *
        * *******************************************/

        // 0. Create Directories
        const docsFolder = path.join(__dirname, answersProject.docs);
        const { error } = await createDocsFolder(docsFolder)
        if (error) return; // Stop Process

        // 1. Create a READ Me file for ignorant developers
        await generateREADME(docsFolder)

        // 2. Create Swagger Config Files
        await fs.writeFile(path.join(__dirname, CONSTANTS.config_file), JSON.stringify(answersProject), 'utf-8');

        // 3. Generate route files
        await generateSwagifyRouteFiles(docsFolder, swaggerRoutes)

        // 4. Generate schema files
        await generateSwagifySchemaFiles(docsFolder, swaggerSchemas);

        // 5. Update .gitignore if necessary
        await updateGitignore(answersProject.gitignore, __dirname, answersProject.docs);

        // 6. Generate Swagger Json
        if (config_json && config_json.name) await generateSwaggerJson(config_json, __dirname);

        // 7. Done
        console.log(chalk.blue(`${answersProject.name} (${answersProject.version})`), "has been", chalk.yellowBright('Swagified!'))


    });

    // parse arguments
    program.parse(process.argv);
}

init();