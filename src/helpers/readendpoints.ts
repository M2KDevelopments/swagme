import { ISwagifyRoute } from "../interfaces/swagify.route";
import fs from 'fs/promises';
import path from 'path';


export async function getSwaggerInfoFromExpressRoutes(__dirname: string, routeAnswer: string, mainFileAnswer: string, routesFileNames: Array<string>) {

    const swaggerRoutes = [] as Array<ISwagifyRoute>;
    if (!routesFileNames.length) return swaggerRoutes;

    
    const mainFile = await fs.readFile(path.join(__dirname, mainFileAnswer), 'utf8')


    const baseRouteMap = new Map<string, string>(); // <file:string, baseroute:string>
    const variableNameList = [] as Array<{ variable: string, filename: string }>;

    // Get the base route from the main file
    const lines = mainFile.split("\n");
    for (const line of lines) {

        // e.g const routes = require('./api/routes/user')
        // e.g import routes from './api/routes/user';
        // e.g app.use('/users', require(''./api/routes/user''));
        if (line.includes(`${routeAnswer}/`)) {
            if (line.includes(".use(")) {
                if (line.includes('require')) {
                    const baseRouteMatch = line.match(/(?<=\/).*(?=\W,)/);
                    const filenameMatch = line.match(new RegExp(`(?<=${routeAnswer}).*(?=("|'))`));
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
                const filenameMatch = line.match(new RegExp(`(?<=${routeAnswer}).*(?=("|'))`));
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
                const filenameMatch = line.match(new RegExp(`(?<=${routeAnswer}).*(?=("|'))`));
                const filename = filenameMatch ? filenameMatch[0].replace("/", "") : "";
                variableNameList.push({ variable: routeVariableName, filename })
            }
        }
    }

    //clear array
    while (variableNameList.length) variableNameList.pop();



    for (const f of routesFileNames) {

        // Read Route file
        const file = await fs.readFile(path.join(__dirname, routeAnswer, f), 'utf8')

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
                filename: tagname,
                baseroute: baseRouteMap.get(tagname) || "/",
                routes: routes
            })
        }

    }
    return swaggerRoutes;
}