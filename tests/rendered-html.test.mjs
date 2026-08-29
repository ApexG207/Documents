import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production bundle preserves MatIQ identity and removes preview metadata",async()=>{
  const server=await readFile(new URL("../dist/server/index.js",import.meta.url),"utf8");
  assert.match(server,/MatIQ Jiu-Jitsu Intelligence/);
  assert.doesNotMatch(server,/name=["']codex-preview["']/i);
});

test("production artifact contains every governed migration",async()=>{
  const hosting=JSON.parse(await readFile(new URL("../dist/.openai/hosting.json",import.meta.url),"utf8"));
  assert.equal(hosting.d1,"DB"); assert.equal(hosting.r2,"BUCKET");
  for(let i=0;i<=8;i++){const prefix=String(i).padStart(4,"0");const journal=await readFile(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8");assert.match(journal,new RegExp(`\\"tag\\": \\"${prefix}_`));}
});
