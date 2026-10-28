// Run with: node scripts/check-navigation.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const nav = read("_includes/site-nav.html");
const blog = read("_includes/themes/effector-wide/default.html");
const works = read("works/index.html");
const legacy = read("work/index.html");
const worksJs = read("works/works.js");

for (const [label, route] of Object.entries({ home: "/", works: "/works/", about: "/about/" })) {
  assert.match(nav, new RegExp('href="' + route.replaceAll("/", "\\/") + '" data-nav-label="' + label + '"'));
}
assert.doesNotMatch(nav, /href="\/(?:work|walk)\/?"/);
assert.match(blog, /\{% include site-nav\.html %\}/);
assert.match(works, /\{% include site-nav\.html language="en" %\}/);
assert.match(works, /permalink: \/works\//);
assert.match(legacy, /permalink: \/work\//);
assert.match(legacy, /location\.replace\("\/works\/" \+ window\.location\.search \+ window\.location\.hash\)/);
assert.match(worksJs, /navLinks\.forEach/);
console.log("Navigation routes, shared include, locale labels, and legacy redirect: OK");
