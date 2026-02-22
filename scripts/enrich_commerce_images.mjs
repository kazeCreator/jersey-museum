#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dbPath = path.join(root, 'jersey-db.json');
const imgPath = path.join(root, 'data', 'jersey-real-images.json');

const ALLOWED = [
  'nike.com','adidas.com','puma.com','newbalance.com',
  'kitbag.com','fanatics.com','soccer.com','worldsoccershop.com',
  'classicfootballshirts.co.uk','store.fcbarcelona.com','shop.realmadrid.com'
];

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const imgs = JSON.parse(fs.readFileSync(imgPath, 'utf8'));
const map = new Map(imgs.map(x => [x.id, x]));

function hostOf(u=''){ try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } }
function allow(u=''){ const h=hostOf(u); return ALLOWED.some(d => h===d || h.endsWith('.'+d)); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function ddgSearch(query){
  const url = 'https://duckduckgo.com/html/?q=' + encodeURIComponent(query);
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if(!res.ok) return [];
  const html = await res.text();
  const links = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/g)].map(m=>m[1]);
  const decoded = links.map(h => {
    try {
      const u = new URL(h, 'https://duckduckgo.com');
      const uddg = u.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : h;
    } catch { return h; }
  });
  return decoded.filter(allow);
}

async function getOgImage(url){
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, redirect: 'follow' });
    if(!res.ok) return null;
    const finalUrl = res.url;
    if(!allow(finalUrl)) return null;
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if(!m) return null;
    const img = m[1].trim();
    if(!img || !/^https:\/\//i.test(img)) return null;
    return img;
  } catch { return null; }
}

async function enrichOne(item){
  const q = `${item.entity} ${item.year} ${item.type==='Home'?'home':'away'} jersey buy`;
  const candidates = await ddgSearch(q);
  for(const link of candidates.slice(0,4)){
    const og = await getOgImage(link);
    if(og){
      return {
        id: item.id,
        image_url: og,
        caption: '图片：商城商品图（自动）',
        source_url: link,
        source: hostOf(link),
        image_quality: 'jersey_product',
        confidence: 0.92
      };
    }
    await sleep(120);
  }
  return null;
}

async function main(){
  let added = 0;
  const targets = db.filter(x => !map.has(x.id));
  for(const it of targets){
    const got = await enrichOne(it);
    if(got){ map.set(it.id, got); added++; }
  }
  const out = [...map.values()];
  fs.writeFileSync(imgPath, JSON.stringify(out, null, 2));
  console.log(`targets=${targets.length} added=${added} total=${out.length}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
