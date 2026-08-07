/**
 * dom.js — the only place the codebase touches the DOM API directly.
 *
 * Security note: there is deliberately no `html()` helper and no use of
 * innerHTML anywhere in this project. Every element is constructed and every
 * string is assigned through textContent, so no code path can interpret
 * content as markup. That property is worth more than the few lines it costs
 * — it means an audit of this repo for injection sinks terminates here.
 *
 * @module dom
 */

/**
 * Query one HTML element.
 *
 * The cast is deliberate and confined to this file: `querySelector` is typed
 * as returning `Element`, which lacks `style`, so without it every caller
 * would need its own assertion. Use {@link qsSvg} for SVG nodes.
 *
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {HTMLElement | null}
 */
export function qs(selector, scope = document) {
  return /** @type {HTMLElement | null} */ (scope.querySelector(selector));
}

/**
 * Query one SVG element. Separate from {@link qs} because `SVGElement` and
 * `HTMLElement` are unrelated types.
 *
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {SVGElement | null}
 */
export function qsSvg(selector, scope = document) {
  return /** @type {SVGElement | null} */ (scope.querySelector(selector));
}

/**
 * @param {string} selector
 * @param {ParentNode} [scope=document]
 * @returns {HTMLElement[]}
 */
export function qsa(selector, scope = document) {
  return /** @type {HTMLElement[]} */ (Array.from(scope.querySelectorAll(selector)));
}

/**
 * Create an element. Text is always assigned via textContent.
 *
 * @param {string} tag
 * @param {object} [options]
 * @param {string | string[]} [options.className]
 * @param {string} [options.text] Assigned with textContent, never parsed.
 * @param {Record<string, string>} [options.vars] CSS custom properties.
 * @param {Record<string, string>} [options.attrs]
 * @returns {HTMLElement}
 */
export function el(tag, { className, text, vars, attrs } = {}) {
  const node = document.createElement(tag);
  if (className) {
    const names = Array.isArray(className) ? className : className.split(' ');
    node.classList.add(...names.filter(Boolean));
  }
  if (text !== undefined) node.textContent = text;
  if (vars) setVars(node, vars);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  }
  return node;
}

/**
 * Create an SVG element in the correct namespace.
 *
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs]
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/**
 * Set CSS custom properties on an element.
 *
 * Uses the CSSOM rather than a `style` attribute, which keeps the page
 * compatible with a Content-Security-Policy that omits 'unsafe-inline'.
 *
 * @param {HTMLElement | SVGElement} node
 * @param {Record<string, string>} vars
 * @returns {void}
 */
export function setVars(node, vars) {
  for (const [name, value] of Object.entries(vars)) {
    node.style.setProperty(name.startsWith('--') ? name : `--${name}`, value);
  }
}

/**
 * Append many children in one reflow.
 *
 * @param {Node} parent
 * @param {Node[]} children
 * @returns {void}
 */
export function appendAll(parent, children) {
  const frag = document.createDocumentFragment();
  for (const child of children) frag.appendChild(child);
  parent.appendChild(frag);
}

/**
 * Run a callback for each item on a fixed stagger.
 *
 * @param {ArrayLike<T>} items
 * @param {number} gap Milliseconds between items.
 * @param {(item: T, index: number) => void} fn
 * @returns {number[]} Timer ids, so a caller can cancel them.
 * @template T
 */
export function stagger(items, gap, fn) {
  return Array.from(items, (item, i) => window.setTimeout(() => fn(item, i), i * gap));
}
