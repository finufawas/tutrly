const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { regex: /background:\s*'white'/g, replace: "background: 'var(--white)'" },
  { regex: /background:\s*'#f8fafc'/g, replace: "background: 'var(--background)'" },
  { regex: /background:\s*'#f1f5f9'/g, replace: "background: 'var(--hover-bg)'" },
  { regex: /border:\s*'1px solid #cbd5e1'/g, replace: "border: '1px solid var(--border-color)'" },
  { regex: /border:\s*'1px solid #e2e8f0'/g, replace: "border: '1px solid var(--border-color)'" },
  { regex: /color:\s*'#334155'/g, replace: "color: 'var(--text-dark)'" },
  { regex: /color:\s*'#64748B'/g, replace: "color: 'var(--text-light)'" },
  { regex: /color:\s*'#0f172a'/g, replace: "color: 'var(--text-dark)'" },
  { regex: /color:\s*'#475569'/g, replace: "color: 'var(--text-light)'" },
  { regex: /borderBottom:\s*'1px solid #f1f5f9'/g, replace: "borderBottom: '1px solid var(--border-color)'" },
  { regex: /borderBottom:\s*'1px solid #e2e8f0'/g, replace: "borderBottom: '1px solid var(--border-color)'" },
  { regex: /borderTop:\s*'1px solid #e2e8f0'/g, replace: "borderTop: '1px solid var(--border-color)'" },
  { regex: /background:\s*'#e0e7ff'/g, replace: "background: 'var(--primary-light)'" },
  { regex: /color:\s*'#4338ca'/g, replace: "color: 'var(--primary-dark)'" }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      for (const r of replacements) {
        content = content.replace(r.regex, r.replace);
      }
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Done replacing colors.');
