import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATHS = [
    'server.js',
    'src',
    'public/js',
    'scripts'
];

const files = SOURCE_PATHS
    .flatMap(relativePath =>
        collectJavaScriptFiles(path.join(PROJECT_ROOT, relativePath))
    )
    .filter(file => file !== import.meta.filename)
    .sort();

for (const file of files) {
    const result = spawnSync(
        process.execPath,
        ['--check', file],
        { stdio: 'inherit' }
    );

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);

function collectJavaScriptFiles(targetPath) {
    const stats = statSync(targetPath);
    if (stats.isFile()) {
        return targetPath.endsWith('.js') ? [targetPath] : [];
    }

    return readdirSync(targetPath, { withFileTypes: true })
        .flatMap(entry => {
            const entryPath = path.join(targetPath, entry.name);
            return entry.isDirectory()
                ? collectJavaScriptFiles(entryPath)
                : entryPath.endsWith('.js')
                    ? [entryPath]
                    : [];
        });
}
