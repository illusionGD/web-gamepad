import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

/**
 * @en Keep source imports extensionless; add Node-compatible suffixes only to published declarations.
 * @zh 源码保持无后缀导入，仅为发布的类型声明补充 Node 兼容后缀。
 */
function declarationImports(source, extension) {
  return source.replace(
    /((?:from\s+|import\s*\()\s*['"])(\.\.?\/[^'"]+)(['"])/g,
    (_match, prefix, name, quote) =>
      prefix + name.replace(/\.(?:js|cjs)$/, '') + extension + quote
  )
}

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      entryFileNames: 'esm/[name].js',
      format: 'esm',
      sourcemap: true
    },
    {
      dir: 'dist',
      entryFileNames: 'cjs/[name].cjs',
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    {
      name: 'dual-format-declarations',
      generateBundle(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type !== 'asset' || !asset.fileName.endsWith('.d.ts'))
            continue
          const source =
            typeof asset.source === 'string'
              ? asset.source
              : new TextDecoder().decode(asset.source)
          asset.source = declarationImports(source, '.js')
          this.emitFile({
            type: 'asset',
            fileName: asset.fileName.replace(/\.d\.ts$/, '.d.cts'),
            source: declarationImports(source, '.cjs')
          })
        }
      }
    },
    terser()
  ]
}
