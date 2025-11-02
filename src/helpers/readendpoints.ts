import { ISwagmeRoute } from "../interfaces/swagme.route";
import fs from 'fs/promises';
import path from 'path';


export async function getSwaggerInfoFromExpressRoutes(__currentWorkingDir: string, props: { routeFolder: string, mainFilePath: string, routesFileNames: Array<string> }) {
    const { routeFolder, mainFilePath, routesFileNames } = props;
    const swaggerRoutes = [] as Array<ISwagmeRoute>;
    if (!routesFileNames.length) return swaggerRoutes;

    const mainFile = await fs.readFile(path.join(__currentWorkingDir, mainFilePath), 'utf8')


    const baseRouteMap = new Map<string, string>(); // <file:string, baseroute:string>
    const variableNameList = [] as Array<{ variable: string, filename: string }>;

    // Get the base route from the main file
    const lines = mainFile.split("\n");
    for (const line of lines) {

        // e.g const routes = require('./api/routes/user')
        // e.g import routes from './api/routes/user';
        // e.g app.use('/users', require(''./api/routes/user''));
        if (line.includes(`${routeFolder}/`)) {
            if (line.includes(".use(")) {
                if (line.includes('require')) {
                    const baseRouteMatch = line.match(/(?<=\/).*(?=\W,)/);
                    const filenameMatch = line.match(new RegExp(`(?<=${routeFolder}).*(?=("|'))`));
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
                const filenameMatch = line.match(new RegExp(`(?<=${routeFolder}).*(?=("|'))`));
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
                const filenameMatch = line.match(new RegExp(`(?<=${routeFolder}).*(?=("|'))`));
                const filename = filenameMatch ? filenameMatch[0].replace("/", "") : "";
                variableNameList.push({ variable: routeVariableName, filename })
            }
        }
    }

    //clear array
    while (variableNameList.length) variableNameList.pop();



    for (const f of routesFileNames) {

        // Read Route file
        const file = await fs.readFile(path.join(__currentWorkingDir, routeFolder, f), 'utf8')

        // Define variable to store route info
        const routes = [] as Array<{ method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS', path: string }>;

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
                filename: tagname,
                baseroute: baseRouteMap.get(tagname) || "/",
                routes: routes
            })
        }

    }
    return swaggerRoutes;
}


/**
 * Recursive function to get all the files in the nextjs api folder to generate routes
 * @param __currentWorkingDir 
 * @param basefolder 
 * @param folder 
 * @returns 
 */
async function getNextJSFiles(__currentWorkingDir: string, basefolder: string, folder: string = "") {
    const files: string[] = [];
    try {
        const list = await fs.readdir(path.join(__currentWorkingDir, basefolder, folder));
        for (const fileOrFolder of list) {
            if (fileOrFolder.endsWith(".js") || fileOrFolder.endsWith(".ts")) {
                files.push(path.join(basefolder, folder, fileOrFolder))
            } else { // could be folder
                const file = await fs.stat(path.join(__currentWorkingDir, basefolder, folder, fileOrFolder))
                if (file.isDirectory()) {
                    const newbaseFolder = path.join(basefolder, folder);
                    const innerFolder = fileOrFolder;
                    const innerlist = await getNextJSFiles(__currentWorkingDir, newbaseFolder, innerFolder)
                    files.push(...innerlist);
                }
            }
        }
        return files;
    } catch (e) {
        console.error(e);
        return files;
    }
}

export async function getSwaggerInfoFromNextJSRouter(__currentWorkingDir: string, mainFolder: string): Promise<ISwagmeRoute[]> {
    const files = await getNextJSFiles(__currentWorkingDir, mainFolder);
    const tagMap = new Map<string, ISwagmeRoute>()
    
    for (const file of files) {
        const tagname = file
            .replace(path.join(mainFolder), '') // remove the main page path to api folder for nextjs
            .replace(/^(\/|\\)/, '') // remove the slash if it is at the beginning of the string
            .replace(/(\/|\\).*/, '') // remove everything after the slash
            .replace(".js", '') // remove javascript extension
            .replace(".ts", ''); // remove typescript extension

        if (!tagname) continue;

        const content = await fs.readFile(path.join(__currentWorkingDir, file), 'utf-8');
        const responseReturns = ['.json(', '.status(', '.send(', '.end(', '.redirect(']
        let hasResponseFunction = false;
        for (const fn of responseReturns) {
            if (content.includes(fn)) {
                hasResponseFunction = true;
                break;
            }
        }

        if (content.includes("export default") && hasResponseFunction) {

            const routepath = file
                .replace(path.join(mainFolder), '')
                .replace(/\\/, '/') //change all back slashes to forward slashes
                .replace(".js", '')
                .replace(".ts", '');

            const endpoints: ISwagmeRoute = {
                filename: tagname,
                tagname: tagname,
                baseroute: "",
                routes: [
                    {
                        path: routepath,
                        method: "GET"
                    },
                    {
                        path: routepath,
                        method: "POST"
                    },
                    {
                        path: routepath,
                        method: "PUT"
                    },
                    {
                        path: routepath,
                        method: "PATCH"
                    },
                    {
                        path: routepath,
                        method: "DELETE"
                    }
                ]
            }

            if (tagMap.get(tagname)) tagMap.get(tagname)?.routes.push(...endpoints.routes)
            else tagMap.set(tagname, endpoints);
        }
    }
    return Array.from(tagMap.values());
}