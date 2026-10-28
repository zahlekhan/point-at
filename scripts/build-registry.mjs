// Writes public/r/point-at.json so `npx shadcn add <url>` can install the component.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const item = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'point-at',
  type: 'registry:ui',
  title: 'Point At',
  description: 'A giant hand in a suit sleeve that points at your buttons. A parody of the X Promote hand.',
  registryDependencies: ['utils'],
  files: [
    {
      path: 'components/ui/point-at.tsx',
      type: 'registry:ui',
      content: readFileSync('src/components/ui/point-at.tsx', 'utf8'),
    },
  ],
}

mkdirSync('public/r', { recursive: true })
writeFileSync('public/r/point-at.json', JSON.stringify(item, null, 2) + '\n')
console.log('wrote public/r/point-at.json')
