export interface ISwaggerConfig {
    name: string,
    version: string,
    description: string,
    authorization: string,
    baseurl: string,
    main: string,
    database: string,
    schema: string,
    routes: string,
    docs: string,
    gitignore: boolean
}