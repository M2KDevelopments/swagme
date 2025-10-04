import { ISwagifySchema } from "../interfaces/swagify.schema.ts";

export function getDrizzleSchemaFromFile(filename: string, file: string) {
    const swaggerSchemas: ISwagifySchema[] = [];

  // Remove comments
  const cleanFile = file.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").trim();

  // Look for pgTable definitions
  const pgTableRegex = /pgTable\(\s*["'](\w+)["']\s*,\s*\{([\s\S]*?)\}\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = pgTableRegex.exec(cleanFile)) !== null) {
    const tableName = match[1];
    const fieldsBlock = match[2];

    const fields: { name: string; type: string }[] = [];

    // Split by lines, parse each field
    const lines = fieldsBlock.split(",").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Skip empty lines
      if (!line) continue;

      // Match field name and type builder e.g. id: serial("id").primaryKey()
      const fieldMatch = line.match(/^(\w+)\s*:\s*(\w+)/);
      if (fieldMatch) {
        let [, fieldName, fieldType] = fieldMatch;

        // Detect array
        if (line.includes(".array()")) fieldType += "[]";

        // Lowercase type for consistency
        fields.push({ name: fieldName, type: fieldType.toLowerCase() });
      }
    }

    swaggerSchemas.push({
      tablename: tableName,
      filename: filename.replace(/\.(ts|js)$/, ""),
      fields
    });
  }

  return swaggerSchemas;
}