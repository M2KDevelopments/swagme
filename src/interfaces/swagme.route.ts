export interface ISwagmeRoute {
    filename: string,
    tagname: string,
    baseroute: string,
    routes: Array<{ path: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' }>
}