const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Responsiveness and UX static validation tests...');

const htmlPath = path.join(__dirname, '../index.html');
const cssPath = path.join(__dirname, '../style.css');
const jsPath = path.join(__dirname, '../app.js');

let errors = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    errors++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Validate HTML file presence and structure
if (!fs.existsSync(htmlPath)) {
  console.error('HTML file not found!');
  process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Verify Hamburger button presence
assert(htmlContent.includes('id="hamburger-btn"'), 'index.html contains hamburger button with id "hamburger-btn"');
assert(htmlContent.includes('data-lucide="menu"'), 'hamburger button uses Lucide "menu" icon');

// Verify toggle buttons & disclaimers
assert(htmlContent.includes('id="toggle-sidebar-btn"'), 'index.html contains dashboard sidebar toggle button');
assert(htmlContent.includes('collapsible-disclaimer'), 'index.html contains collapsible-disclaimer elements');
assert(htmlContent.includes('onclick="toggleDisclaimer(this)"'), 'disclaimer headers contain onclick trigger to toggleDisclaimer');
assert(htmlContent.includes('logo-hide-mobile'), 'logo has mobile hide class');
assert(htmlContent.includes('badge-hide-mobile'), 'badge has mobile hide class');
assert(htmlContent.includes('id="rotate-device-overlay"'), 'index.html contains rotate-device-overlay element');
assert(htmlContent.includes('data-lucide="smartphone"'), 'rotate-device-overlay contains smartphone icon');

// Verify JavaScript handlers
assert(htmlContent.includes("window.toggleDisclaimer = function"), 'index.html script defines window.toggleDisclaimer function');
assert(htmlContent.includes("document.getElementById('hamburger-btn')"), 'index.html registers DOM listener for hamburger-btn');

// 2. Validate CSS file media queries and responsive styling
if (!fs.existsSync(cssPath)) {
  console.error('CSS file not found!');
  process.exit(1);
}

const cssContent = fs.readFileSync(cssPath, 'utf8');

// Verify breakpoints exist
assert(cssContent.includes('@media (max-width: 1024px)'), 'style.css contains tablet breakpoint (1024px)');
assert(cssContent.includes('@media (max-width: 768px)'), 'style.css contains mobile breakpoint (768px)');
assert(cssContent.includes('@media (max-width: 480px)'), 'style.css contains smartphone breakpoint (480px)');

// Verify specific mobile selectors in style.css
assert(cssContent.includes('.hamburger-btn'), 'style.css defines styling for .hamburger-btn');
assert(cssContent.includes('.mobile-sidebar-toggle'), 'style.css defines styling for .mobile-sidebar-toggle');
assert(cssContent.includes('.collapsible-disclaimer'), 'style.css defines styling for collapsible disclaimers');
assert(cssContent.includes('.docs-table'), 'style.css defines responsive rules for .docs-table');
assert(cssContent.includes('#scoring-table tr'), 'style.css defines mobile layouts for SCM prediction scoring rows');
assert(cssContent.includes('.logo-hide-mobile'), 'style.css contains logo hiding rules');
assert(cssContent.includes('#rotate-device-overlay'), 'style.css defines styling for #rotate-device-overlay');
assert(cssContent.includes('orientation: portrait'), 'style.css uses portrait orientation check to trigger warnings');

// 3. Validate app.js integrations
if (!fs.existsSync(jsPath)) {
  console.error('app.js file not found!');
  process.exit(1);
}

const jsContent = fs.readFileSync(jsPath, 'utf8');
assert(jsContent.includes('window.scrollTo(0, 0)'), 'app.js scrolls window to top on main tab switch');
assert(jsContent.includes("document.getElementById('hamburger-btn')"), 'app.js includes logic to auto-close hamburger menu');

if (errors > 0) {
  console.error(`\n❌ Validation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 All responsiveness and UX static validation tests passed successfully!');
}
