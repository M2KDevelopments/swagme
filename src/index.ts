import figlet from 'figlet';
import chalk from 'chalk';
import { program } from "commander";
import inquirer from "inquirer";
import path, { dirname } from 'path';
import fs from 'fs/promises';

// Get base directory - https://dev.to/adrvnc/how-to-resolve-the-dirname-is-not-defined-in-es-module-scope-error-in-javascript-584
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialization
program
    .version("1.0.0")
    .description("Node Js CLI tool that auto generates swagger api documentation for express web servers. Takes advantage of the MVC Pattern");



// Show Title
console.log(chalk.yellow(figlet.textSync("Swag", { horizontalLayout: "full" })));
console.log(chalk.yellowBright('Auto Documentation'), 'Let\'s Get Started!');


async function readPackageJSON() {
    try {
        const package_json = await fs.readFile(path.join(__dirname, 'package.json'), 'utf8');
        return { json: JSON.parse(package_json), error: null }
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


async function init() {

    // Read package.json
    const { json, error } = await readPackageJSON();
    if (error) return console.error(chalk.redBright(error));

    // Express dependency
    if (!json.dependencies || !json.dependencies.express) {
        return console.error(
            chalk.yellow('express'),
            chalk.redBright('dependency not found. Run:'),
            chalk.yellow('npm install express')
        );
    }

    // Swagger Dependency Check
    if (!json.dependencies || !json.dependencies['swagger-ui-express']) {
        console.warn(
            chalk.yellow('We recommend installing "swagger-ui-express". Run:'),
            chalk.green('npm install swagger-ui-express')
        )
    }


    const prompts = [
        {
            "type": "input",
            "name": "name",
            "message": "Name of Express API",
            "default": json.name
        },
        {
            "type": "input",
            "name": "main",
            "message": "Path where you've defined your express app. e.g 'const app = express();' ",
            "default": "/src/index.js",
        },
        {
            "type": "list",
            "name": "database",
            "message": "Choose Database, ODM or ORM:",
            "choices": [
                "mongoose",
                "postgres",
                "prisma",
                "drizzle"
            ]
        },
        {
            "type": "input",
            "name": "schema",
            "message": "Where is a folder for your schemas or models. (To ignore models/schema leave it blank)",
            "default": "/models",
        },
        {
            "type": "input",
            "name": "routes",
            "message": "Where is a folder for your routes",
            "default": "/routes"
        },
    ];

    // process actions
    program.action(async () => {

        // Get Project answers
        const answersProject = await inquirer.prompt(prompts);

        // Validation Checks
        if (!answersProject.name && answersProject.name.trim()) return console.error(chalk.redBright(`Please make sure you enter the name`))
        if (!answersProject.routes && answersProject.routes.trim()) return console.error(chalk.redBright(`Please make sure you enter the routes folder`))
        if (answersProject.schema) return console.error(chalk.redBright(`Please make sure you enter the schema folder`))

        // Mongoose Dependency Check
        if (!json.dependencies.mongoose && answersProject.database == 'mongoose') {
            return console.error(
                chalk.yellow('Could not find "mongoose" in your project\'s package.json file. Run:'),
                chalk.green('npm install mongoose')
            )
        }


        //Read files
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
        const promptFileAndFolders = [
            {
                "type": "checkbox",
                "name": "routefiles",
                "message": "Choose Files for where routers are defined",
                "choices": ['SELECT ALL', ...routesFiles.filter(name => name.includes('.'))]
            },

        ];

        // Add Schema Prompt
        if (schemaFiles.length) {
            promptFileAndFolders.unshift({
                "type": "checkbox",
                "name": "schemafiles",
                "message": "Choose Files for where your models/schemas are defined",
                "choices": ['SELECT ALL', ...schemaFiles.filter(name => name.includes('.'))]
            })
        }

        // Get answers for files
        const answersFiles = await inquirer.prompt(promptFileAndFolders);

        // read schemas and models
        if (schemaFiles.length) {
            const list = answersFiles.schemafiles.includes("SELECT ALL") ? schemaFiles : answersFiles.schemafiles
            const foldername = answersProject.schema;
            if (answersProject.database == 'mongoose') {

                for (const filename of list) {
                    const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                    // Get schema json 
                    if (file.indexOf('.Schema(') != -1) {

                        // counters for '{' and  '}'F
                        let countOpenBrace = 0;
                        let countCloseBrace = 0;
                        const startSearchIndex = file.indexOf('.Schema(');

                        const chrs = file.substring(startSearchIndex).split("")
                        for (const i in chrs) {
                            // get the text with { }
                            if (chrs[i] == "{") countOpenBrace++;
                            if (chrs[i] == "}") countCloseBrace++;
                            if (countOpenBrace > 0 && (countOpenBrace == countCloseBrace)) {
                                const start = file.substring(startSearchIndex).indexOf('{');
                                const end = +i + 1;
                                console.log(file.substring(startSearchIndex).substring(start, end));
                                break;
                            }
                        }
                    }
                }
            } else if (answersProject.database == 'postgres') {

            } else if (answersProject.database == 'prisma') {

            } else if (answersProject.database == 'drizzle') {
                for (const filename of list) {
                    const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                    // Get schema json 
                    if (file.indexOf('pgTable(') != -1) {

                        // counters for '{' and  '}'F
                        let countOpenBrace = 0;
                        let countCloseBrace = 0;
                        const startSearchIndex = file.indexOf('pgTable(');

                        const chrs = file.substring(startSearchIndex).split("")
                        for (const i in chrs) {
                            // get the text with { }
                            if (chrs[i] == "{") countOpenBrace++;
                            if (chrs[i] == "}") countCloseBrace++;
                            if (countOpenBrace > 0 && (countOpenBrace == countCloseBrace)) {
                                const start = file.substring(startSearchIndex).indexOf('{');
                                const end = +i + 1;
                                console.log(file.substring(startSearchIndex).substring(start, end));
                                break;
                            }
                        }
                    }
                }
            }
        }


    });

    // parse arguments
    program.parse(process.argv);
}

init();