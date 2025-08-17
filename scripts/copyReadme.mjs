import {existsSync, readdirSync, mkdirSync, copyFileSync} from 'fs';
import {resolve, join } from 'path';
import { cwd } from 'node:process';

const rootDir = cwd();
const targetDir = resolve(rootDir, 'packages', 'core');

// 查找根目录下的所有.md文件
const files = readdirSync(rootDir).filter(file => file.endsWith('.md'));

if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
}

files.forEach(file => {
    const src = join(rootDir, file);
    const dest = join(targetDir, file);
    copyFileSync(src, dest);
    console.log(`Copied ${file} to packages/core`);
});

export {};