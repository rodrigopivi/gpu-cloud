declare module 'morgan' {
  import { Request, Response, NextFunction } from 'express';
  
  type FormatFn = (tokens: TokenIndexer, req: Request, res: Response) => string | undefined | null;
  type TokenIndexer = {
    [tokenName: string]: (req: Request, res: Response, arg?: string | number | boolean) => string | undefined;
  };
  
  interface Morgan {
    (format: string, options?: Options): (req: Request, res: Response, next: NextFunction) => void;
    (format: FormatFn, options?: Options): (req: Request, res: Response, next: NextFunction) => void;
    token(name: string, fn: TokenCallbackFn): Morgan;
    compile(format: string): FormatFn;
  }
  
  type TokenCallbackFn = (req: Request, res: Response, arg?: string | number | boolean) => string | undefined;
  
  interface Options {
    immediate?: boolean;
    skip?: (req: Request, res: Response) => boolean;
    stream?: { write: (str: string) => void };
  }
  
  const morgan: Morgan;
  export = morgan;
}
