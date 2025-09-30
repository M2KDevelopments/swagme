import { ISwagifySchema } from "../interfaces/swagify.schema";

export function getDrizzleSchemaFromFile(filename: string, file: string) {
    const swaggerSchemas = [] as Array<ISwagifySchema>;
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
    return swaggerSchemas;
}