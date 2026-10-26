import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)),port=Number(process.env.PORT||4175);
// Loopback by default. `npm run share` listens on every interface so a phone on the same Wi-Fi can open it.
const host=process.env.HOST||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==resolve(root)&&!path.startsWith(resolve(root)+sep))throw new Error('Invalid path');if((await stat(path)).isDirectory())path=resolve(path,'index.html');res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(path));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,host,()=>console.log(`Cook99: http://localhost:${port}${host==='127.0.0.1'?'':' (shared on the local network)'}`));
