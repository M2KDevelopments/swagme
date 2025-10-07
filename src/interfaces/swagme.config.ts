export interface ISwaggerConfig {
    name: string,
    version: string,
    description: string,
    authorization: 'bearer' | 'basic' | 'none' | undefined,
    baseurl: string,
    main: string,
    database: string,
    schema: string,
    routes: string,
    docs: string,
    gitignore: boolean
}