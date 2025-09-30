export interface ISwagifyRoute{ 
    filename: string, 
    tagname: string, 
    baseroute: string, 
    routes: Array<{ path: string, method: string }> 
}