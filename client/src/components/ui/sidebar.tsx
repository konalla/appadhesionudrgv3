const fs = require("fs");
const path = require("path");

// Recursively walk a directory, looking at .tsx files
function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".tsx")) {
      let code = fs.readFileSync(fullPath, "utf8");
      const updated = code
        .replace(/t\(\s*['"]common\.main['"]\s*\)/g, '"Principal"')
        .replace(
          /t\(\s*['"]common\.systemAdmin['"]\s*\)/g,
          '"Administration Système"',
        );
      if (updated !== code) {
        fs.writeFileSync(fullPath, updated, "utf8");
        console.log(`\n👉 Updated: ${fullPath}\n`);
        console.log(updated);
      }
    }
  });
}

// Change './src' to wherever your code lives
walk(path.resolve(__dirname, "src"));
