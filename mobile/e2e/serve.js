const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2], port=+process.argv[3];
const types={'.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.ttf':'font/ttf'};
http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));
 if(!p.startsWith(root)||!fs.existsSync(p)||fs.statSync(p).isDirectory()) p=path.join(root,'index.html');
 r.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r);}).listen(port);
