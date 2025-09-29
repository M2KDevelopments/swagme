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
console.log(chalk.yellow(figlet.textSync("Swagify", { horizontalLayout: "full" })));
console.log(chalk.yellowBright('Auto Swagger Documentation'), 'Let\'s Get Started!');


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
    const { json: package_json, error } = await readPackageJSON();
    if (error) return console.error(chalk.redBright(error));

    // Express dependency
    if (!package_json.dependencies || !package_json.dependencies.express) {
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


    const prompts = [
        {
            "type": "input",
            "name": "name",
            "message": "Name of Express API",
            "default": package_json.name
        },
        {
            "type": "input",
            "name": "description",
            "message": "Project description",
            "default": package_json.description || "",
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
            "default": "http://localhost:3000",
        },
        {
            "type": "input",
            "name": "main",
            "message": "Path where you've defined your express app. e.g 'const app = express();' ",
            "default": mainRouteFile,
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

        // Mongoose Dependency Check
        if (!package_json.dependencies.mongoose && answersProject.database == 'mongoose') {
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
        const swaggerScheams = [] as Array<{ tablename: string, fields: Array<{ name: string, type: string }> }>;
        if (schemaFiles.length) {
            const list = answersFiles.schemafiles.includes("SELECT ALL") ? schemaFiles : answersFiles.schemafiles
            const foldername = answersProject.schema;
            if (answersProject.database == 'mongoose') {


                for (const filename of list) {
                    const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                    // Get schema json 
                    if (file.indexOf('.Schema(') != -1) {

                        // counters for '{' and  '}'
                        let countOpenBrace = 0;
                        let countCloseBrace = 0;
                        const startSearchIndex = file.indexOf('.Schema(');

                        const chrs = file.substring(startSearchIndex).split("")
                        for (const i in chrs) {
                            // get the text within '{' '}'
                            if (chrs[i] == "{") countOpenBrace++;
                            if (chrs[i] == "}") countCloseBrace++;
                            if (countOpenBrace > 0 && (countOpenBrace == countCloseBrace)) {
                                const start = file.substring(startSearchIndex).indexOf('{');
                                const end = +i + 1;

                                // remove comments and everything in one line
                                let fullschema = file.substring(startSearchIndex).substring(start, end).replace(/\/\/.*|(?=\/\*)(.*)(\*\/)/gmi, '').replace(/\n/gmi, '');

                                countOpenBrace = 0;
                                countCloseBrace = 0;

                                // markers to insert new line. 
                                // So the each field and the adjecent json is on the same line 
                                const insertNewLinesIndices = [];
                                for (const j in fullschema.split("")) {
                                    if (parseInt(j) == 0 && fullschema[j] == '{') {
                                        insertNewLinesIndices.push(0);
                                        continue;
                                    }
                                    if (fullschema[j] == '{') countOpenBrace++;
                                    else if (fullschema[j] == '}') countCloseBrace++;
                                    if (countOpenBrace > 0 && countOpenBrace == countCloseBrace) {
                                        insertNewLinesIndices.push(parseInt(j));
                                        //reset counter
                                        countOpenBrace = 0;
                                        countCloseBrace = 0;
                                    }
                                }

                                // places to insert new lines
                                for (const j in insertNewLinesIndices) {
                                    const index = insertNewLinesIndices[j];
                                    // keep in mind by adding a new line it shifts where to put the new lines by '\n'.length
                                    const shift = "\n".length * parseInt(j);

                                    fullschema = fullschema.substring(0, index + shift + 1) + "\n" + fullschema.substring(index + shift + 1);
                                }

                                /* Look something like this  
                                    {
                                        '_id: mongoose.Schema.Types.ObjectId,    user: { type: String, required: true }
                                    ,        name: { type: String, required: true }
                                    ,        pipeline: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline', required: true }
                                    ,        description: { type: String, default: "" }
                                    ,        color: { type: String, default: "" }
                                    ,        colors: { type: [String], default: "" }
                                    ,        names: { default: "", type: [String], }
                                    ,    }
                                */

                                const fields = [];
                                const mongoModelMatch = file.match(/(?<=model\W).*(?=,)/)
                                const tablename = mongoModelMatch ? mongoModelMatch[0]
                                    // Remove all quotation marks
                                    .replace("'", "")
                                    .replace("'", "")
                                    .replace('"', "")
                                    .replace('"', "") : "";

                                if (tablename) {
                                    for (const newline of fullschema.split("\n")) {

                                        const line = newline
                                            // remove mongoose.Schema.Types.ObjectId
                                            .replace(/.*ObjectId/, '')
                                            // remove commas and trim lines
                                            .replace(/^\,/, '').trim();

                                        // Todo be available to matches array types e.g [String], [Number]
                                        const matches = line.match(/type.*\w+(\,|\s|\})\W/)


                                        if (matches) {

                                            // Example 1 - ['type: Number }', ' ', index: 69, input: '_id: mongoose.Schema.Types.ObjectId,    teams: { default: 0, min: 0, type: Number }', groups: undefined]
                                            // Example 2 - ['type: String, ', ',', index: 24, input: 'name: { required: true, type: String, }', groups: undefined]
                                            // Example 3 -  ['type: String, required: true, ', ',', index: 9, input: 'email: { type: String, required: true, match: /@/ }', groups: undefined]
                                            const phrase = matches[0].replace(/(\,|\}).*/g, '');

                                            // Should have e.g type: Boolean
                                            // Edge case type: { type: String (if the field name is also 'type')
                                            const fieldname = line.replace(/\:.*/, '').replace(/\W+/, '').trim();
                                            const fieldtype = phrase.replace(/.*\:/, '').replace(/\W+/, '').trim();
                                            fields.push({ name: fieldname, type: fieldtype })
                                        }
                                    }

                                    // to array list
                                    swaggerScheams.push({ tablename: tablename, fields });

                                }

                                break;
                            }
                        }
                    }
                }

            } else if (answersProject.database == 'prisma') {
                const items = [] as Array<{ tablename: string, fields: Array<{ name: string, type: string }> }>;

                for (const filename of list) {
                    const file = await fs.readFile(path.join(__dirname, foldername, filename), 'utf8')
                    const fullschema = file.replace(/\/\/.*|(?=\/\*)(.*)(\*\/)/gmi, '').trim();
                    const list = fullschema.split("model").filter(s => s.trim());

                    // get table name and its field names and types
                    for (const item of list) {
                        const schema = { fields: [] as Array<{ name: string, type: string }>, tablename: "" };
                        for (const line of item.split("\n")) {

                            if (line.includes("{")) { // get table name
                                schema.tablename = line.replace("{", "").trim();
                            } else if (!line.includes("}") && line.trim()) { // get table fiele
                                const [name, type] = line.trim().replace(/\s/gmi, ' ').split(" ").filter(s => s);
                                if (name.trim() && type.trim()) {
                                    schema.fields.push({
                                        name: name.trim(),
                                        type: type.trim()
                                    });
                                }
                            }
                        }

                        if (schema.tablename) items.push(schema);
                    }
                }

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

        const swaggerRoutes = [] as Array<{ tagname: string, baseroute: string, routes: Array<{ path: string, method: string }> }>;
        if (routesFiles.length) {
            const mainFile = await fs.readFile(path.join(__dirname, answersProject.main), 'utf8')
            const baseRouteMap = new Map<string, string>(); // <file:string, baseroute:string>

            const variableNameList = [] as Array<{ variable: string, filename: string }>;

            // Get the base route from the main file
            const lines = mainFile.split("\n");
            for (const line of lines) {

                // e.g const routes = require('./api/routes/user')
                // e.g import routes from './api/routes/user';
                // e.g app.use('/users', require(''./api/routes/user''));
                if (line.includes(`${answersProject.routes}/`)) {
                    if (line.includes(".use(")) {
                        if (line.includes('require')) {
                            const baseRouteMatch = line.match(/(?<=\/).*(?=\W,)/);
                            const filenameMatch = line.match(new RegExp(`(?<=${answersProject.routes}).*(?=("|'))`));
                            const baseroute = baseRouteMatch ? `/${baseRouteMatch[0]}` : "";
                            const filename = filenameMatch ? filenameMatch[0].replace("/", "") : "";
                            baseRouteMap.set(filename.replace(".js", "").replace(".ts", ""), baseroute)
                        } else {
                            for (const { variable, filename } of variableNameList) {
                                if (line.includes(variable)) {
                                    const baseRouteMatch = line.match(/(?<=\/).*(?=\W,)/);
                                    const baseroute = baseRouteMatch ? `/${baseRouteMatch[0]}` : "";
                                    baseRouteMap.set(filename.replace(".js", "").replace(".ts", ""), baseroute)
                                }
                            }
                        }
                    } else if (line.includes("import ")) {
                        const routeVariableName = line.split("from")[0].replace("import", "").trim();
                        const filenameMatch = line.match(new RegExp(`(?<=${answersProject.routes}).*(?=("|'))`));
                        const filename = filenameMatch ? filenameMatch[0].replace("/", "") : "";
                        variableNameList.push({ variable: routeVariableName, filename })
                    } else if ((line.includes("const ") || line.includes("let ") || line.includes("var ")) && line.includes("require")) {
                        const routeVariableName = line
                            .split("require")[0]
                            .replace("const", "")
                            .replace("let", "")
                            .replace("var", "")
                            .replace("=", "")
                            .trim();
                        const filenameMatch = line.match(new RegExp(`(?<=${answersProject.routes}).*(?=("|'))`));
                        const filename = filenameMatch ? filenameMatch[0].replace("/", "") : "";
                        variableNameList.push({ variable: routeVariableName, filename })
                    }
                }
            }

            //clear array
            while (variableNameList.length) variableNameList.pop();



            for (const f of routesFiles) {

                // Read Route file
                const file = await fs.readFile(path.join(__dirname, answersProject.routes, f), 'utf8')

                // Define variable to store route info
                const routes = [] as Array<{ method: string, path: string }>;

                for (const line of file.split("\n")) {
                    // GET REQUEST
                    if (line.includes(`.get("/`) || line.includes(`.get('/`)) {
                        const routeNameMatch = line.match(/(?<=\/).*(?=\W,)/);
                        const routeName = routeNameMatch ? routeNameMatch[0] : "";
                        if (routeName) routes.push({ method: "GET", path: `/${routeName}` });
                    }
                    // POST REQUEST
                    else if (line.includes(`.post("/`) || line.includes(`.post('/`)) {
                        const routeNameMatch = line.match(/(?<=\/).*(?=\W,)/);
                        const routeName = routeNameMatch ? routeNameMatch[0] : "";
                        if (routeName) routes.push({ method: "POST", path: `/${routeName}` });
                    }
                    // PATCH REQUEST
                    else if (line.includes(`.patch("/`) || line.includes(`.patch('/`)) {
                        const routeNameMatch = line.match(/(?<=\/).*(?=\W,)/);
                        const routeName = routeNameMatch ? routeNameMatch[0] : "";
                        if (routeName) routes.push({ method: "PATCH", path: `/${routeName}` });
                    }
                    // PUT REQUEST
                    else if (line.includes(`.put("/`) || line.includes(`.put('/`)) {
                        const routeNameMatch = line.match(/(?<=\/).*(?=\W,)/);
                        const routeName = routeNameMatch ? routeNameMatch[0] : "";
                        if (routeName) routes.push({ method: "PUT", path: `/${routeName}` });
                    }
                    // DELETE REQUEST
                    else if (line.includes(`.delete("/`) || line.includes(`.delete('/`)) {
                        const routeNameMatch = line.match(/(?<=\/).*(?=\W,)/);
                        const routeName = routeNameMatch ? routeNameMatch[0] : "";
                        if (routeName) routes.push({ method: "DELETE", path: `/${routeName}` });
                    }
                }

                // Make the express path parameters into swagger path parameters
                // e.g /users/:id  --->  /users/{id}
                for (const i in routes) {
                    for (const pathtext of routes[i].path.split(":")) {
                        const n = pathtext.replace(/\/.*/, '');
                        if (!n) continue;
                        routes[i].path = routes[i].path.replace(`:${n}`, `{${n}}`)
                    }
                }


                // Add routes to list
                const tagname = f.replace(".js", '').replace(".ts", '')
                if (baseRouteMap.get(tagname)) {
                    swaggerRoutes.push({
                        tagname: tagname.toUpperCase(),
                        baseroute: baseRouteMap.get(tagname) || "/",
                        routes: routes
                    })
                }

            }
        }


    });

    // parse arguments
    program.parse(process.argv);
}

init();