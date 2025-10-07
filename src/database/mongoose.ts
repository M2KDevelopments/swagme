import { ISwagmeSchema } from "../interfaces/swagme.schema";

export function getMongooseSchemaFromFile(filename: string, file: string) {
    const swaggerSchemas = [] as Array<ISwagmeSchema>;
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
                // match module.exports = 'mongoose.model('Assistant', schema);'
                const mongoModelMatch = file.match(/(?<=model\(\W).*(?=,)/)
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
                            fields.push({ name: fieldname, type: fieldtype.toLowerCase() })
                        }
                    }

                    // check if timestamps
                    if (fullschema.match(/timestamp.*:.*true/m)) {
                        fields.push({ name: 'createdAt', type: 'date' });
                        fields.push({ name: 'updatedAt', type: 'date' })
                    }

                    // to array list
                    swaggerSchemas.push({
                        tablename: tablename,
                        filename: filename
                            .replace(".ts", "")
                            .replace(".js", ""),
                        fields: fields
                    });

                }

                break;
            }
        }
    }
    return swaggerSchemas;
}