import { ISwagifySchema } from "../interfaces/swagify.schema";

export function getPrimsaSchemaFromFile(filename: string, file: string) {
    const swaggerSchemas = [] as Array<ISwagifySchema>;
    const fullschema = file.replace(/\/\/.*|(?=\/\*)(.*)(\*\/)/gmi, '').trim();
    const list = fullschema.split("model").filter(s => s.trim());

    // get table name and its field names and types
    for (const item of list) {
        const schema = { fields: [] as Array<{ name: string, type: string }>, tablename: "", filename: filename };
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

        if (schema.tablename) swaggerSchemas.push(schema);
    }
    return swaggerSchemas;
}