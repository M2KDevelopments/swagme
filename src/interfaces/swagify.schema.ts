export interface ISwagifySchema {
    filename: string,
    tablename: string,
    fields: Array<{ name: string, type: string }>
}
