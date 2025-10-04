export interface ISwagmeSchema {
    filename: string,
    tablename: string,
    fields: Array<{ name: string, type: string }>
}
