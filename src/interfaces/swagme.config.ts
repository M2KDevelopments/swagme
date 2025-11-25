import { IAuthorization } from "./authorization";
import { IORM } from "./orm";

export interface ISwaggerConfig {
    name: string,
    version: string,
    description: string,
    authorization: IAuthorization,
    baseurl: string,
    main: string,
    database: IORM,
    schema: string,
    routes: string,
    docs: string,
    gitignore: boolean
}