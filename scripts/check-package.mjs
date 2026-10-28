import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=JSON.parse(read('legacy-integrity.json'));
for(const [name,expected] of Object.entries(manifest)){
 const bytes=fs.readFileSync(path.join(root,'public/legacy',name));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,name);
}
for(const name of ['public/data/saebom-city.json','public/data/verification.json','public/fonts/PretendardVariable.woff2','public/fonts/LICENSE.txt','public/brand/saebom-logo.svg','public/brand/saebom-symbol.svg','package-lock.json']) assert.ok(fs.existsSync(path.join(root,name)),name);
for(const name of ['.openai','.sites-runtime','.env']) assert.ok(!fs.existsSync(path.join(root,name)),'Private/local file: '+name);
const docs=['README.md',...fs.readdirSync(path.join(root,'docs')).filter(f=>f.endsWith('.md')).map(f=>'docs/'+f)];
let links=0;
for(const name of docs) for(const match of read(name).matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
 const url=match[1];if(/^(?:https?:|mailto:|#)/.test(url))continue;
 const destination=decodeURIComponent(url.split('#')[0]);
 assert.ok(fs.existsSync(path.resolve(root,path.dirname(name),destination)),name+': '+url);links++;
}
for(const name of ['src/main.jsx','src/App.jsx','src/Panels.jsx']){
 const text=read(name);
 assert.ok(!/fetch\(['"]\/data\//.test(text),'Hardcoded data path: '+name);
 assert.ok(!/(?:src|href)="\/(?:brand|legacy)\//.test(text),'Hardcoded public path: '+name);
}
assert.equal(JSON.parse(read('public/data/saebom-city.json')).meta.synthetic,true);
console.log('PASS package: '+Object.keys(manifest).length+' legacy hashes, '+links+' document links, required assets, local-file exclusions, and base paths.');
