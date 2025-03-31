import postcss, {Declaration} from 'postcss';
import safeParser from 'postcss-safe-parser';
import * as fs from "node:fs";
import path from "node:path";

type BrowserIdentifier = "firefox" | "safari" | "chrome";
type EngineName = "gecko" | "webkit" | "blink";

function browserIdentifierToEngineName(browserIdentifier: BrowserIdentifier): EngineName {
  switch (browserIdentifier) {
    case "chrome":
      return "blink";
    case "firefox":
      return "gecko";
    case "safari":
      return "webkit";
  }
}

async function fetchHtmlCss(browserIdentifier: BrowserIdentifier) {
  let url: string;
  switch (browserIdentifier) {
    case "firefox":
      url = 'https://raw.githubusercontent.com/mozilla/gecko-dev/refs/heads/master/layout/style/res/html.css'
      break
    case "safari":
      url = 'https://raw.githubusercontent.com/WebKit/WebKit/refs/heads/main/Source/WebCore/css/html.css'
      break
    case "chrome":
      url = 'https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/core/css/html.css?format=TEXT'
      break
  }
  if (!url) {
    throw new Error(`Unknown browser identifier ${browserIdentifier}`);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch firefox css from ${url}`);
  const text = await response.text();
  if (browserIdentifier === "chrome") {
    return Buffer.from(text, 'base64').toString('utf-8');
  }
  return text;
}

interface CssDefault extends Partial<Record<EngineName, Record<string, string>>> {
  element: string;
  defaults: {},
  trident: {},
}

async function main() {
  const browserIdentifiers: BrowserIdentifier[] = ["firefox", "safari", "chrome"];
  let resultBySelector: Map<string, CssDefault> = new Map();
  for (const browserIdentifier of browserIdentifiers) {
    const engineName = browserIdentifierToEngineName(browserIdentifier);
    const cssString = await fetchHtmlCss(browserIdentifier);
    const postcssResult = postcss().process(cssString, {parser: safeParser});
    postcssResult.root.walkRules(/.*/, rule => {
      for (const selector of rule.selectors) {
        for (const node of rule.nodes) {
          if (!(node instanceof Declaration)) continue;
          if (!node.prop.length || !node.value.length) continue;
          resultBySelector.set(selector, {
            ...(resultBySelector.get(selector) ?? {
              element: selector,
              defaults: {},
              trident: {},
            }),
            [engineName]: {
              ...resultBySelector.get(selector)?.[engineName],
              [node.prop]: node.value,
            }
          })
        }
      }
    })
  }
  return Array.from(resultBySelector.values())
}

const __dirname = import.meta.dirname
const js_file_name = path.join(__dirname, 'css-defaults.js')
fs.writeFileSync(js_file_name, "export const cssDefaults = " + JSON.stringify(await main(), null, 2));
